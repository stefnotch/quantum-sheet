import { UseQuantumElement, QuantumElementType } from "../document-element";
import {
  ref,
  Ref,
  watch,
  reactive,
  shallowRef,
  computed,
  watchEffect,
  shallowReactive,
} from "vue";
import { UseScopedVariable, UseScopedGetter } from "./scope-element";
import { cas } from "../../cas";
import { assert } from "../../assert";
import { CasCommand } from "../../../cas/cas";
import { getGetterNames, getVariableNames } from "../../../cas/cas-math";

export const ElementType = "expression-element";

export interface UseExpressionElement extends UseQuantumElement {
  getters: ReadonlyMap<string, UseScopedGetter>;
  variables: ReadonlyMap<string, UseScopedVariable>;
  expression: Ref<any>;
  /**
   * User expression input
   * @param value Expression that the user typed
   */
  inputExpression(value: any): void;
}

function addPlaceholders(expression: any) {
  if (Array.isArray(expression)) {
    const functionName = expression[0];
    const output = expression.slice();
    if (functionName == "Equal") {
      output[1] = addPlaceholders(expression[1]);
      output[2] = ["\\mathinner", ["Missing", ""]];
    } else if (functionName == "To") {
      output[1] = addPlaceholders(expression[1]);
      output[3] = ["\\mathinner", ["Missing", ""]];
    } else {
      for (let i = 1; i < expression.length; i++) {
        output[i] = addPlaceholders(expression[i]);
      }
    }
    return output;
  } else {
    return expression;
  }
}

function useExpressionElement(block: UseQuantumElement): UseExpressionElement {
  const expression = shallowRef();
  const getters = shallowReactive(new Map<string, UseScopedGetter>());
  const variables = shallowReactive(new Map<string, UseScopedVariable>());
  const runningCasExpression: Ref<CasCommand | undefined> = shallowRef();
  const blockPosition = computed(() => block.position.value);

  function setExpression(value: any) {
    expression.value = value;
  }

  function setGetters(getterNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(getterNames);
    getters.forEach((getter, variableName) => {
      if (!namesToAdd.has(variableName)) {
        getter.remove();
        getters.delete(variableName);
      } else {
        namesToAdd.delete(variableName);
      }
    });

    if (namesToAdd.size > 0) {
      const scope = block.scope.value;
      assert(scope, "Expected the block to have a scope");
      namesToAdd.forEach((variableName) => {
        const newGetter = scope.addGetter(variableName, blockPosition);
        watch(newGetter.data, (value) => {
          clearVariableValues();
          clearPlaceholders();
          if (value !== undefined && value !== null) evaluateLater();
        });
        getters.set(variableName, newGetter);
      });
    }
  }

  function setVariables(variableNames: ReadonlySet<string>) {
    const namesToAdd = new Set<string>(variableNames);

    variables.forEach((variable, variableName) => {
      if (!namesToAdd.has(variableName)) {
        variable.remove();
        variables.delete(variableName);
      } else {
        namesToAdd.delete(variableName);
      }
    });
    if (namesToAdd.size > 0) {
      const scope = block.scope.value;
      assert(scope, "Expected the block to have a scope");
      namesToAdd.forEach((variableName) => {
        const newVariable = scope.addVariable(variableName, blockPosition);
        variables.set(variableName, newVariable);
      });
    }
  }

  function clearVariableValues() {
    variables.forEach((v) => v.setData(null));
  }

  function clearPlaceholders() {
    // TODO: Reduce flashing (make this slightly delayed or something)
    function clearPlaceholders(expression: any) {
      if (Array.isArray(expression)) {
        const functionName = expression[0];
        const output = expression.slice();
        if (functionName == "Equal") {
          output[1] = addPlaceholders(expression[1]);
          output[2] = ["\\mathinner", ["Missing", ""]];
        } else if (functionName == "To") {
          output[1] = addPlaceholders(expression[1]);
          output[3] = ["\\mathinner", ["Missing", ""]];
        } else {
          for (let i = 1; i < expression.length; i++) {
            output[i] = addPlaceholders(expression[i]);
          }
        }
        return output;
      } else {
        return expression;
      }
    }

    setExpression(clearPlaceholders(expression.value));
  }

  function inputExpression(value: any) {
    // TODO: Make expression value readonly
    setGetters(getGetterNames(value));
    setVariables(getVariableNames(value));

    assert(block.scope.value, "Expected the block to have a scope");

    setExpression(addPlaceholders(value));
    // Cascading invalidation, only the topmost ones will be valid commands
    clearVariableValues();
    evaluateLater();
  }

  watch(block.scope, (value) => {
    if (value) {
      // TODO: Re-create getters and variables when the scope changes
      clearVariableValues();
      clearPlaceholders();
      evaluateLater();
    } else {
      setGetters(new Set<string>());
      setVariables(new Set<string>());
      if (runningCasExpression.value) {
        cas.cancelCommand(runningCasExpression.value);
      }
    }
  });

  function evaluateLater() {
    if (runningCasExpression.value) {
      cas.cancelCommand(runningCasExpression.value);
    }

    // Check if all getters that should have a value actually do have a value
    const gettersData = new Map<string, any>();
    let allDataDefined = true;
    getters.forEach((value, key) => {
      const data = value.data.value;
      if (data === undefined) {
        // It's a symbol
      } else if (data === null) {
        // Variable is missing its data
        allDataDefined = false;
      } else {
        gettersData.set(key, data);
      }
    });

    if (!allDataDefined || !expression.value) {
      return;
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

    // TODO: Fix c:=8+4=
    function evaluateExpression(
      expression: any,
      callback: (result: any) => void
    ) {
      if (Array.isArray(expression)) {
        const functionName = expression[0];
        if (functionName == "Equal") {
          evaluateExpression(expression[1], (result) => {
            const casExpression = expression.slice();
            casExpression[1] = result;

            runningCasExpression.value = new CasCommand(
              gettersData, // TODO: Don't pass in all getters
              casExpression,
              (result) => {
                // TODO: Fix this for nested equals signs/expressions
                const output = expression.slice();
                output[2] = ["\\mathinner", result];
                setExpression(output);
                callback(result);
              }
            );
            cas.executeCommand(runningCasExpression.value);
          });
        } else if (functionName == "To") {
          evaluateExpression(expression[1], (result) => {
            const casExpression = expression.slice();
            casExpression[1] = result;

            runningCasExpression.value = new CasCommand(
              gettersData, // TODO: Don't pass in all getters
              casExpression,
              (result) => {
                // TODO: Fix this for nested equals signs/expressions
                const output = expression.slice();
                output[3] = ["\\mathinner", result];
                setExpression(output);
                callback(result);
              }
            );
            cas.executeCommand(runningCasExpression.value);
          });
        } else if (functionName == "Apply") {
          // TODO:
        } else {
          callback(expression);
        }
      } else {
        callback(expression);
      }
    }

    if (Array.isArray(expression.value) && expression.value[0] == "Assign") {
      evaluateExpression(expression.value[2], (result) => {
        runningCasExpression.value = new CasCommand(
          gettersData, // TODO: Don't pass in all getters
          ["Equal", result, null],
          (result) => {
            // TODO: Support assigning to multiple variables
            assert(
              variables.size === 1,
              "Assigning to multiple variables not supported yet"
            );
            variables.forEach((v) => v.setData(result));
          }
        );
        cas.executeCommand(runningCasExpression.value);
      });
    } else {
      assert(variables.size === 0, "Expected no variables");
      evaluateExpression(expression.value, (result) => {});
    }
  }

  return {
    ...block,
    getters,
    variables,
    expression,
    inputExpression,
  };
}

function serializeElement(element: UseExpressionElement): string {
  throw new Error(`Serialization not implemented yet`);
}

function deserializeElement(data: string): UseExpressionElement {
  throw new Error(`Serialization not implemented yet`);
}

export const ExpressionElementType: QuantumElementType<
  UseExpressionElement,
  typeof ElementType
> = {
  typeName: ElementType,
  documentType: {
    [ElementType]: {
      typeName: ElementType,
      useElement: useExpressionElement,
      serializeElement: serializeElement,
      deserializeElement: deserializeElement,
    },
  },
};
