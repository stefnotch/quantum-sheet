import { UseQuantumElement, QuantumElementType } from "../document-element";
import { ref, Ref, watch, reactive } from "vue";
import { UseScopedVariable, UseScopedGetter } from "./scope-element";
import { cas } from "../../../model/cas";

export const ElementType = "expression-element";

export interface UseExpressionElement extends UseQuantumElement {
  expression: Ref<any>;
  setExpression(value: any): void;
}

function useExpressionElement(block: UseQuantumElement): UseExpressionElement {
  const expression = ref({});
  const getters = reactive(new Map<string, UseScopedGetter>());
  const variables = reactive(new Map<string, UseScopedVariable>());
  const casExpressionGetters = new Map<string, any>();
  let casParsedExpression: any = undefined;

  function setExpression(value: any) {
    expression.value = value;
  }

  watch(block.position, (value) => {
    getters.forEach((getter) => getter.setPosition(value));
    variables.forEach((variable) => variable.setPosition(value));
  });

  watch(expression, (value) => {
    const parseResults = cas.parseExpression(value);

    casExpressionGetters.clear();

    // TODO: Recalculate expressions when getter has changed
    // Update getters
    getters.forEach((getter, variableName) => {
      if (!parseResults.getters.has(variableName)) {
        getter.remove();
        getters.delete(variableName);
      } else {
        parseResults.getters.delete(variableName);
      }
    });
    if (block.scope.value) {
      parseResults.getters.forEach((variableName) => {
        const newGetter = block.scope.value!.addGetter(variableName, (data) => {
          casExpressionGetters.set(variableName, data);
          cas.calculateExpression({
            id: block.id,
            getterData: casExpressionGetters,
            expression: casParsedExpression,
            callback: casExpressionResultCallback,
          });
        });
        getters.set(variableName, newGetter);
        newGetter.setPosition(block.position.value);
      });
    }

    // Update variables
    variables.forEach((variable, variableName) => {
      if (!parseResults.variables.has(variableName)) {
        variable.remove();
        variables.delete(variableName);
      } else {
        parseResults.variables.delete(variableName);
      }
    });
    if (block.scope.value) {
      parseResults.variables.forEach((variableName) => {
        const newVariable = block.scope.value!.addVariable(variableName);
        variables.set(variableName, newVariable);
        newVariable.setPosition(block.position.value);
      });
    }

    casParsedExpression = parseResults.parsedExpression;
    // Calculate the expression
    cas.calculateExpression({
      id: block.id,
      getterData: casExpressionGetters,
      expression: casParsedExpression,
      callback: casExpressionResultCallback,
    });
  });

  function casExpressionResultCallback(
    variableResults: { name: string; data: any }[],
    resultingExpression: any
  ) {
    variableResults.forEach((v) => {
      variables.get(v.name)?.setData(v.data);
    });
    setExpression(resultingExpression);
  }

  return {
    ...block,
    expression,
    setExpression,
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
