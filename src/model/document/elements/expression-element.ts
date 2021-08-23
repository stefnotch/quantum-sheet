import { QuantumElementType, QuantumElement, QuantumElementCreationOptions } from '../document-element'
import { ref, Ref, watch, reactive, shallowRef, computed, watchEffect, shallowReactive } from 'vue'
import { UseScopedVariable, UseScopedGetter, ScopeElementType } from './scope-element'
import { cas } from '../../cas'
import { assert } from '../../assert'
import { CasCommand } from '../../../cas/cas'
import { getGetterNames, getVariableNames } from '../../../cas/cas-math'
import { Expression, match, substitute } from '@cortex-js/compute-engine'
import { Vector2 } from '../../vectors'

export const ElementType = 'expression-element'

export class ExpressionElement extends QuantumElement {
  typeName: typeof ElementType = ElementType

  // TODO: Make the getters and expression readonly to the outside
  readonly expression = shallowRef<Expression>('')
  readonly getters: Map<string, UseScopedGetter> = shallowReactive(new Map<string, UseScopedGetter>())
  readonly variables: Map<string, UseScopedVariable> = shallowReactive(new Map<string, UseScopedVariable>())

  private readonly runningCasExpression: Ref<CasCommand | undefined> = shallowRef()
  private readonly blockPosition = computed(() => this.position.value)

  constructor(options: QuantumElementCreationOptions) {
    super(options)
    // TODO: Make sure that watchers won't leak
    watch(this.scope, (value) => {
      // Remove getters and variables when the scope changes
      this.updateGetters(new Set<string>())
      this.updateVariables(new Set<string>())
      if (this.runningCasExpression.value) {
        cas.cancelCommand(this.runningCasExpression.value)
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

  private evaluateLater() {
    if (this.runningCasExpression.value) {
      cas.cancelCommand(this.runningCasExpression.value)
    }

    if (!this.hasExpression) return

    const gettersData = this.getGettersData()
    if (!gettersData) {
      return
    }

    const self = this
    // TODO: Fix c:=8+4=
    function evaluateExpression(expression: any, callback: (result: any) => void) {
      if (Array.isArray(expression)) {
        const functionName = expression[0]
        if (functionName == 'Equal') {
          evaluateExpression(expression[1], (result) => {
            const casExpression = expression.slice()
            casExpression[1] = result

            self.runningCasExpression.value = new CasCommand(
              gettersData, // TODO: Don't pass in all getters (or pass in a reference to the getters?)
              casExpression,
              (result) => {
                // TODO: Fix this for nested equals signs/expressions
                const output = expression.slice()
                output[2] = ['\\mathinner', result] // A part of the expression, namely the one with the placeholder, gets replaced
                self.expression.value = output
                callback(result)
              }
            )
            cas.executeCommand(self.runningCasExpression.value)
          })
        } else if (functionName == 'Evaluate') {
          evaluateExpression(expression[1], (result) => {
            const casExpression = expression.slice()
            casExpression[1] = result

            self.runningCasExpression.value = new CasCommand(
              gettersData, // TODO: Don't pass in all getters (or pass in a reference to the getters?)
              casExpression,
              (result) => {
                // TODO: Fix this for nested equals signs/expressions
                const output = expression.slice()
                output[3] = ['\\mathinner', result]
                self.expression.value = output
                callback(result)
              }
            )
            cas.executeCommand(self.runningCasExpression.value)
          })
        } else if (functionName == 'Apply') {
          // TODO:
        } else {
          callback(expression)
        }
      } else {
        callback(expression)
      }
    }

    if (Array.isArray(this.expression.value) && this.expression.value[0] == 'Assign') {
      evaluateExpression(this.expression.value[2], (result) => {
        this.runningCasExpression.value = new CasCommand(
          gettersData, // TODO: Don't pass in all getters (or pass in a reference to the getters?)
          ['Equal', result, null],
          (result) => {
            // TODO: Support assigning to multiple variables
            assert(this.variables.size === 1, 'Assigning to multiple variables not supported yet')
            this.variables.forEach((v) => v.setData(result))
          }
        )
        cas.executeCommand(this.runningCasExpression.value)
      })
    } else {
      assert(this.variables.size === 0, 'Expected no variables')
      evaluateExpression(this.expression.value, (result) => {})
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
