import { QuantumElementType, QuantumElement, QuantumElementCreationOptions } from '../document-element'
import { ref, Ref, watch, reactive, shallowRef, computed, watchEffect, shallowReactive } from 'vue'
import { UseScopedVariable, UseScopedGetter, ScopeElementType } from './scope-element'
import { cas } from '../../cas'
import { assert } from '../../assert'
import { CasCommand, CasExpression } from '../../../cas/cas'
import { getGetterNames } from '../../../cas/cas-math'
import { Expression, match, substitute } from '@cortex-js/compute-engine'
import { Vector2 } from '../../vectors'
import { getExpressionValue, handleExpressionValue } from './../../../cas/mathjson-utils'

export const ElementType = 'expression-element'

export class ExpressionElement extends QuantumElement {
  typeName: typeof ElementType = ElementType

  // TODO: Make the getters and expression readonly to the outside
  readonly expression = shallowRef<Expression>('')
  readonly getters: Map<string, UseScopedGetter> = shallowReactive(new Map<string, UseScopedGetter>())
  readonly variables: Map<string, UseScopedVariable> = shallowReactive(new Map<string, UseScopedVariable>())

  private readonly runningCasCommand: Ref<CasCommand | undefined> = shallowRef()
  private readonly blockPosition = computed(() => this.position.value)

  constructor(options: QuantumElementCreationOptions) {
    super(options)
    // TODO: Make sure that watchers won't leak
    watch(this.scope, (value) => {
      // Remove getters and variables when the scope changes
      this.updateGetters(new Set<string>())
      this.updateVariables(new Set<string>())
      if (this.runningCasCommand.value) {
        cas.cancelCommand(this.runningCasCommand.value)
      }

      // If we have a new scope, recompute
      if (value) {
        if (!this.hasExpression) return
        this.updateGetters(getGetterNames(this.expression.value))
        this.updateVariables(getVariableNames(this.expression.value))

        this.clearResultAndVariables()
        this.evaluateLater()
      }
    })
  }

  get hasExpression() {
    return this.expression.value !== '' && this.expression.value !== null && this.expression.value !== undefined
  }

  /**
   * Gets all the data from every getter
   * @returns The expressions or undefined if at least one getter doesn't have its value
   */
  private getGettersData() {
    const gettersData = new Map<string, Expression>()
    for (const [name, getter] of this.getters) {
      const data = getter.data.value
      if (data === undefined) {
        // It's a symbol
      } else if (data === null) {
        // Variable is missing its data
        return
      } else {
        gettersData.set(name, data)
      }
    }
    return gettersData
  }

  /**
   * User expression input
   * @param value Expression that the user typed
   */
  inputExpression(value: Expression) {
    // TODO: Make expression value readonly
    this.expression.value = value

    if (!this.scope.value) return
    if (!this.hasExpression) return

    this.updateGetters(getGetterNames(this.expression.value))
    this.updateVariables(getVariableNames(this.expression.value))

    this.clearResultAndVariables()
    this.evaluateLater()
  }

  private clearResultAndVariables() {
    // Cascading invalidation, only the topmost ones will be valid commands
    this.variables.forEach((v) => v.setData(null))
    this.expression.value = clearResult(this.expression.value)
  }

  private updateGetters(getterNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(getterNames)
    this.getters.forEach((getter, variableName) => {
      if (!namesToAdd.has(variableName)) {
        // Remove getters that aren't needed anymore
        getter.remove()
        this.getters.delete(variableName)
      } else {
        // Don't double-add names
        namesToAdd.delete(variableName)
      }
    })

    if (namesToAdd.size <= 0) return

    const scope = this.scope.value
    assert(scope, 'Expected the block to have a scope')
    namesToAdd.forEach((variableName) => {
      const newGetter = scope.addGetter(variableName, this.blockPosition)
      watch(newGetter.data, (value) => {
        this.clearResultAndVariables()
        if (value !== undefined && value !== null) this.evaluateLater()
      })
      this.getters.set(variableName, newGetter)
    })
  }

  private updateVariables(variableNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(variableNames)

    this.variables.forEach((variable, variableName) => {
      if (!namesToAdd.has(variableName)) {
        variable.remove()
        this.variables.delete(variableName)
      } else {
        namesToAdd.delete(variableName)
      }
    })

    if (namesToAdd.size <= 0) return
    const scope = this.scope.value
    assert(scope, 'Expected the block to have a scope')
    namesToAdd.forEach((variableName) => {
      const newVariable = scope.addVariable(variableName, this.blockPosition)
      this.variables.set(variableName, newVariable)
    })
  }

  /**
   * Returns `true` if it's an "Equal" or "Evaluate" expression.
   */
  private isCasExpression(expression: Expression): expression is CasExpression {
    // Woah, user defined type guards are fancy https://2ality.com/2020/06/type-guards-assertion-functions-typescript.html#user-defined-type-guards
    const value = getExpressionValue(expression)
    if (value.type === 'function') {
      const { head } = value.value
      if (head === 'Equal' || head === 'Evaluate') {
        return true
      }
    }
    return false
  }

  private executeCasExpression(
    expression: CasExpression,
    gettersData: Map<string, Expression<number>>,
    callback: (result: any | null, resultingExpression: Expression) => void
  ) {
    const value = getExpressionValue(expression)
    assert(value.type === 'function', 'Expected a function expression')

    // Test for nested CAS expressions. This relies on all CAS expressions being ["something", stuff to eval, "Missing"]
    if (this.isCasExpression(expression[1])) {
      this.executeCasExpression(expression[1], gettersData, (result, resultingExpression) => {
        // Show that expression (callback can get called multiple times for that reason)
        expression = expression.slice() as CasExpression
        expression[1] = resultingExpression // TODO: This can result in more getters existing https://github.com/stefnotch/quantum-sheet/issues/40
        callback(null, expression)

        const computeExpression = expression.slice() as CasExpression
        computeExpression[1] = result
        // And now compute a bit more
        this.runningCasCommand.value = new CasCommand(
          gettersData, // TODO: Don't pass in all getters (or pass in a reference to the getters?)
          computeExpression,
          (result) => {
            const output = expression.slice()
            if (expression[0] === 'Evaluate') {
              output[3] = ['\\mathinner', result] // ["Evaluate", lhs, solve arguments, rhs]
            } else {
              output[2] = ['\\mathinner', result] // A part of the expression, namely the one with the placeholder, gets replaced
            }
            callback(result, output)
          }
        )
        cas.executeCommand(this.runningCasCommand.value)
      })
    } else {
      this.runningCasCommand.value = new CasCommand(
        gettersData, // TODO: Don't pass in all getters (or pass in a reference to the getters?)
        expression,
        (result) => {
          const output = expression.slice()
          if (expression[0] === 'Evaluate') {
            output[3] = ['\\mathinner', result] // ["Evaluate", lhs, solve arguments, rhs]
          } else {
            output[2] = ['\\mathinner', result] // A part of the expression, namely the one with the placeholder, gets replaced
          }
          callback(result, output)
        }
      )
      cas.executeCommand(this.runningCasCommand.value)
    }
  }

  private evaluateLater() {
    if (this.runningCasCommand.value) {
      cas.cancelCommand(this.runningCasCommand.value)
    }

    if (!this.hasExpression) return

    const gettersData = this.getGettersData()
    if (!gettersData) {
      return
    }

    // TODO: What about very nested evaluate signs? Like `a:=(1+2=)^2`

    const value = getExpressionValue(this.expression.value)
    if (value.type === 'function') {
      const { head, args } = value.value

      if (head === 'Assign') {
        // Only top-level assignments are supported
        // Everything else is probably an assignment to a variable that only exists inside the expression (e.g. $\sum_{i:=1}^n$)
        const innerExpression = args[1]

        if (this.isCasExpression(innerExpression)) {
          // e.g. a := 3+5 =
          this.executeCasExpression(innerExpression, gettersData, (result, resultingExpression) => {
            this.expression.value = [head, args[0], resultingExpression]

            // TODO: Support assigning to multiple variables
            assert(this.variables.size === 1, 'Assigning to multiple variables not supported yet')
            this.variables.forEach((v) => v.setData(result))
          })
        } else {
          // e.g. a := 3
          this.executeCasExpression(['Evaluate', innerExpression, 'Missing', 'Missing'], gettersData, (result, _) => {
            // TODO: Support assigning to multiple variables
            assert(this.variables.size === 1, 'Assigning to multiple variables not supported yet')
            this.variables.forEach((v) => v.setData(result))
          })
        }
      } else if (this.isCasExpression(this.expression.value)) {
        // e.g. 3+5 =
        assert(this.variables.size === 0, 'Expected no variables')
        this.executeCasExpression(this.expression.value, gettersData, (_, resultingExpression) => {
          this.expression.value = resultingExpression
        })
      }
    } else {
      // Not a function, do nothing
    }
  }
}

function clearResult(expression: Expression) {
  // TODO: Use patterns and replacements https://cortexjs.io/compute-engine/guides/patterns-and-rules/

  if (Array.isArray(expression)) {
    const functionName = expression[0]
    const output = expression.slice()
    if (functionName == 'Equal') {
      output[1] = clearResult(expression[1])
      output[2] = ['\\mathinner', ['Missing', '']]
    } else if (functionName == 'Evaluate') {
      output[1] = clearResult(expression[1])
      output[3] = ['\\mathinner', ['Missing', '']]
    } else {
      for (let i = 1; i < expression.length; i++) {
        output[i] = clearResult(expression[i])
      }
    }
    return output
  } else {
    return expression
  }
}

/**
 * Variables that are being *written* to
 */
function getVariableNames(expression: Expression) {
  // TODO: This can be done with the match function (compute engine, wait for next version)
  const variables = new Set<string>()
  if (Array.isArray(expression) && expression[0] == 'Assign') {
    if (typeof expression[1] == 'string') {
      variables.add(expression[1])
    } else {
      // TODO: Handle variable arrays
      throw new Error('Cannot assign to this ' + expression[1])
    }
  }
  return variables
}

export const ExpressionElementType: QuantumElementType<ExpressionElement, typeof ExpressionElement, typeof ElementType> = {
  typeName: ElementType,
  elementType: ExpressionElement,
  serializeElement: (element: ExpressionElement) => {
    const serializedElement = {
      id: element.id,
      typeName: ElementType,
      position: { x: element.position.value.x, y: element.position.value.y },
      size: { x: element.size.value.x, y: element.size.value.y },
      resizable: element.resizable.value,
      // expression element properties
      expression: element.expression.value,
    }
    return serializedElement
  },
  deserializeElement: (elementData) => {
    const creationOptions = {
      id: elementData.id,
      position: new Vector2(elementData.position.x, elementData.position.y),
      size: new Vector2(elementData.size.x, elementData.size.y),
      resizable: elementData.resizable,
    }
    const element = new ExpressionElement(creationOptions)
    return {
      element: element,
      onAddedCallback: () => {
        element.inputExpression(elementData.expression)
      },
    }
  },
}
