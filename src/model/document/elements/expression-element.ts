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

function useExpressionElement(block: UseQuantumElement): UseExpressionElement {
  const expression = shallowRef();
  const getters = shallowReactive(new Map<string, UseScopedGetter>());
  const variables = shallowReactive(new Map<string, UseScopedVariable>());
  const parsedExpression = shallowRef();
  const runningCasExpression: Ref<CasCommand | undefined> = shallowRef();
  const blockPosition = computed(() => block.position.value);

  function setExpression(value: any) {
    expression.value = value;
  }

  function inputExpression(value: any) {
    // TODO: Make expression value readonly
    const parseResults = cas.parseExpression(value);
    if (!parseResults) {
      getters.forEach((getter, variableName) => {
        getter.remove();
        getters.delete(variableName);
      });
      variables.forEach((variable, variableName) => {
        variable.remove();
        variables.delete(variableName);
      });
      return;
    }
    console.log("Parsed", parseResults);

    const scope = block.scope.value;
    assert(scope, "Expected the block to have a scope");

    // Update getters
    getters.forEach((getter, variableName) => {
      if (!parseResults.getters.has(variableName)) {
        getter.remove();
        getters.delete(variableName);
      } else {
        parseResults.getters.delete(variableName);
      }
    });
    parseResults.getters.forEach((variableName) => {
      const newGetter = scope.addGetter(variableName, blockPosition);
      watch(newGetter.data, (value) => {
        clearVariables();
        if (value) evaluateLater();
      });
      getters.set(variableName, newGetter);
    });

    // Update variables
    variables.forEach((variable, variableName) => {
      if (!parseResults.variables.has(variableName)) {
        variable.remove();
        variables.delete(variableName);
      } else {
        parseResults.variables.delete(variableName);
      }
    });
    parseResults.variables.forEach((variableName) => {
      const newVariable = scope.addVariable(variableName, blockPosition);
      variables.set(variableName, newVariable);
    });

    parsedExpression.value = parseResults.parsedExpression;
    clearVariables(); // Cascading invalidation, only the topmost ones will be valid commands
    evaluateLater();
  }

  watch(block.scope, (value) => {
    if (value) {
      // TODO: Re-create getters and variables when the scope changes
      clearVariables();
      evaluateLater();
    } else {
      getters.forEach((getter, variableName) => {
        getter.remove();
        getters.delete(variableName);
      });
      variables.forEach((variable, variableName) => {
        variable.remove();
        variables.delete(variableName);
      });

      if (runningCasExpression.value) {
        cas.cancelCommand(runningCasExpression.value);
      }
    }
  });

  function clearVariables() {
    variables.forEach((v) => v.setData(undefined));
  }

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

    if (!allDataDefined || !parsedExpression.value) {
      return;
    }

    runningCasExpression.value = new CasCommand(
      gettersData,
      parsedExpression.value,
      casExpressionResultCallback
    );
    cas.executeCommand(runningCasExpression.value);
  }

  function casExpressionResultCallback(result: {
    variables: { name: string; data: any }[];
    expression: any;
  }) {
    result.variables.forEach((v) => {
      variables.get(v.name)?.setData(v.data);
    });
    setExpression(result.expression);
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
