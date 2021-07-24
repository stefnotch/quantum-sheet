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

  readonly expression = shallowRef<Expression>([])
  // TODO: Make the getters readonly to the outside
  readonly getters: Map<string, UseScopedGetter> = shallowReactive(new Map<string, UseScopedGetter>())
  readonly variables: Map<string, UseScopedVariable> = shallowReactive(new Map<string, UseScopedVariable>())

  private readonly runningCasExpression: Ref<CasCommand | undefined> = shallowRef()
  private readonly blockPosition = computed(() => this.position.value)

  constructor(options: QuantumElementCreationOptions) {
    super(options)
    // if (options.expression) this.setExpression(options.expression)
    // if (options.getters) this.setGetters(options.getters)
    // if (options.variables) this.setVariables(options.variables)
    watch(this.scope, (value) => {
      if (value) {
        // TODO: Re-create getters and variables when the scope changes
        this.clearVariableValues()
        this.clearPlaceholders()
        this.evaluateLater()
      } else {
        this.setGetters(new Set<string>())
        this.setVariables(new Set<string>())
        if (this.runningCasExpression.value) {
          cas.cancelCommand(this.runningCasExpression.value)
        }
      }
    })
  }

  /**
   * User expression input
   * @param value Expression that the user typed
   */
  inputExpression(value: Expression) {
    // TODO: Make expression value readonly
    this.setGetters(getGetterNames(value))
    this.setVariables(getVariableNames(value))

    assert(this.scope.value, 'Expected the block to have a scope')

    this.setExpression(addPlaceholders(value))
    // Cascading invalidation, only the topmost ones will be valid commands
    this.clearVariableValues()
    this.evaluateLater()
  }

  setExpression(value: Expression) {
    this.expression.value = value
  }

  setGetters(getterNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(getterNames)
    this.getters.forEach((getter, variableName) => {
      if (!namesToAdd.has(variableName)) {
        getter.remove()
        this.getters.delete(variableName)
      } else {
        namesToAdd.delete(variableName)
      }
    })

    if (namesToAdd.size > 0) {
      const scope = this.scope.value
      assert(scope, 'Expected the block to have a scope')
      namesToAdd.forEach((variableName) => {
        const newGetter = scope.addGetter(variableName, this.blockPosition)
        watch(newGetter.data, (value) => {
          this.clearVariableValues()
          this.clearPlaceholders()
          if (value !== undefined && value !== null) this.evaluateLater()
        })
        this.getters.set(variableName, newGetter)
      })
    }
  }

  setVariables(variableNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(variableNames)

    this.variables.forEach((variable, variableName) => {
      if (!namesToAdd.has(variableName)) {
        variable.remove()
        this.variables.delete(variableName)
      } else {
        namesToAdd.delete(variableName)
      }
    })
    if (namesToAdd.size > 0) {
      const scope = this.scope.value
      assert(scope, 'Expected the block to have a scope')
      namesToAdd.forEach((variableName) => {
        const newVariable = scope.addVariable(variableName, this.blockPosition)
        this.variables.set(variableName, newVariable)
      })
    }
  }

  clearVariableValues() {
    this.variables.forEach((v) => v.setData(null))
  }

  clearPlaceholders() {
    // TODO: Reduce flashing (make this slightly delayed or something)
    function clearPlaceholders(expression: Expression) {
      if (Array.isArray(expression)) {
        const functionName = expression[0]
        const output = expression.slice()
        if (functionName == 'Equal') {
          output[1] = addPlaceholders(expression[1])
          output[2] = ['\\mathinner', ['Missing', '']]
        } else if (functionName == 'Evaluate') {
          output[1] = addPlaceholders(expression[1])
          output[3] = ['\\mathinner', ['Missing', '']]
        } else {
          for (let i = 1; i < expression.length; i++) {
            output[i] = addPlaceholders(expression[i])
          }
        }
        return output
      } else {
        return expression
      }
    }

    this.setExpression(clearPlaceholders(this.expression.value))
  }

  evaluateLater() {
    if (this.runningCasExpression.value) {
      cas.cancelCommand(this.runningCasExpression.value)
    }

    // Check if all getters that should have a value actually do have a value
    const gettersData = new Map<string, any>()
    let allDataDefined = true
    this.getters.forEach((value, key) => {
      const data = value.data.value
      if (data === undefined) {
        // It's a symbol
      } else if (data === null) {
        // Variable is missing its data
        allDataDefined = false
      } else {
        gettersData.set(key, data)
      }
    })

    if (!allDataDefined || !this.expression.value) {
      return
    }

    // TODO:
    /*
      - Topmost can optionally be ["Assign", variables, executeable-expression]
        - Variables can be "variable" or ["???", "variable", "variable", ...]
          - Variables will always remain sorted!
        
        - Executeable Expression topmost can optionally be
          - ["Equal", executeable-expression, options, ["Result???", null|result]] = (but only use 2 decimal places) = cm = m
          - ["Solve", executeable-expression, options, ["Result???", null|result]] --solve, n-->
          - ["Apply", executeable-expression, options, ["Result???", null|result]] | apply *3 | apply +2
          - Or it can be a simple-expression
        
        - Simple Expression can contain 
          - "Add", "Subtract", "Multiply", "Divide", ===, <, and so on
      */

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
                self.setExpression(output)
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
                self.setExpression(output)
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

/**
 * Parameters to pass when creating an element
 */
// export interface QuantumExpressionElementCreationOptions extends QuantumElementCreationOptions {
//   expression?: Expression
//   getters?: ReadonlySet<string>
//   variables?: ReadonlySet<string>
// }

export const ExpressionElementType: QuantumElementType<ExpressionElement, typeof ExpressionElement, typeof ElementType> = {
  typeName: ElementType,
  elementType: ExpressionElement,
  serializeElement: (element: ExpressionElement) => {
    // console.log('serializing me in type', element)
    const serializedElement = {
      id: element.id,
      // typeName: element.typeName, // unnecessary
      position: { x: element.position.value.x, y: element.position.value.y },
      size: { x: element.size.value.x, y: element.size.value.y },
      resizable: element.resizable.value,
      // selected: element.selected.value, // unnecessary
      // focused: element.focused.value, // unnecessary
      expression: element.expression.value,
      // getters: JSON.stringify(Array.from(element.getters.values())), // evaluated from Expression upon inputExpression
      // variables: element.variables, // evaluated from Expression upon inputExpression
      // scope: typeof element.scope.value !== 'undefined' ? ScopeElementType.serializeElement(element.scope.value) : null, // evaluated from Expression upon inputExpression
    }
    // console.log(serializedElement)
    // return JSON.stringify(serializedElement)
    return serializedElement
  },
  deserializeElement: (element) => {
    // null as any
    const expressionElement = {
      // document-element properties
      // id:
      position: new Vector2(element?.position?.x, element?.position?.y),
      size: new Vector2(element?.size.x, element?.size.y),
      resizable: JSON.parse(element?.resizable),
      expression: element.expression,
      // scope: ScopeElementType.deserializeElement(element.scope), // evaluated from Expression upon inputExpression
    }
    // expressionElement.setScope(ScopeElementType.deserializeElement(element.scope)) // scope
    // expression-element properties
    // expressionElement.setExpression(element.expression) // expression
    // expressionElement.setGetters(new Set(JSON.parse(element.getters))) // getters // evaluated from Expression upon inputExpression
    // expressionElement.setVariables(JSON.parse(element.variables)) // variables
    return expressionElement
  },
}

function addPlaceholders(expression: Expression) {
  // TODO: Use patterns and replacements https://cortexjs.io/compute-engine/guides/patterns-and-rules/

  if (Array.isArray(expression)) {
    const functionName = expression[0]
    const output = expression.slice()
    if (functionName == 'Equal') {
      output[1] = addPlaceholders(expression[1])
      output[2] = ['\\mathinner', ['Missing', '']]
    } else if (functionName == 'Evaluate') {
      output[1] = addPlaceholders(expression[1])
      output[3] = ['\\mathinner', ['Missing', '']]
    } else {
      for (let i = 1; i < expression.length; i++) {
        output[i] = addPlaceholders(expression[i])
      }
    }
    return output
  } else {
    return expression
  }
}
