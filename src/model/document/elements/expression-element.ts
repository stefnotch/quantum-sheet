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

function getGettersAndVariables(expression: any) {
  const getters = new Set<string>();
  const variables = new Set<string>();

  if (!Array.isArray(expression)) {
    if (typeof expression == "string") {
      getters.add(expression);
    }
  } else {
    if (expression[0] == "Assign") {
      // TODO: Handle variable arrays
      variables.add(expression[1]);
      extractGetters(expression[2]);
    } else {
      extractGetters(expression);
    }

    function extractGetters(expression: any) {
      if (Array.isArray(expression)) {
        const functionName = expression[0];
        for (let i = 1; i < expression.length; i++) {
          extractGetters(expression[i]);
        }
      } else if (typeof expression === "string") {
        getters.add(expression);
      }
    }
  }

  return {
    getters: getters,
    variables: variables,
  };
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
          if (value) evaluateLater();
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
    variables.forEach((v) => v.setData(undefined));
  }

  function inputExpression(value: any) {
    // TODO: Make expression value readonly
    const parseResults = getGettersAndVariables(value);

    setGetters(parseResults.getters);
    setVariables(parseResults.variables);

    const scope = block.scope.value;
    assert(scope, "Expected the block to have a scope");

    // TODO: Insert placeholders into the expression!
    setExpression(value);
    // Cascading invalidation, only the topmost ones will be valid commands
    clearVariableValues();
    evaluateLater();
  }

  watch(block.scope, (value) => {
    if (value) {
      // TODO: Re-create getters and variables when the scope changes
      clearVariableValues();
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

    const gettersData = new Map<string, any>();
    let allDataDefined = true;
    getters.forEach((value, key) => {
      const data = value.data.value;
      if (!data) allDataDefined = false;
      gettersData.set(key, data);
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
    // TODO: Fix 1*1=
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
                const output = expression.slice();
                output[2] = result;
                setExpression(output);
                callback(result);
              }
            );
            cas.executeCommand(runningCasExpression.value);
          });
        } else if (functionName == "Solve") {
          // TODO:
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
        const casExpression = ["Equal", result, null];

        runningCasExpression.value = new CasCommand(
          gettersData, // TODO: Don't pass in all getters
          casExpression,
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
