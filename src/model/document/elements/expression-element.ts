import { UseQuantumElement, QuantumElementType } from "../document-element";
import { ref, Ref } from "vue";

export const ElementType = "expression-element";

export interface UseExpressionElement extends UseQuantumElement {
  expression: Ref<any>;
  setExpression(value: any): void;
}

function useExpressionElement(block: UseQuantumElement): UseExpressionElement {
  const expression = ref({});

  function setExpression(value: any) {
    expression.value = value;
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
