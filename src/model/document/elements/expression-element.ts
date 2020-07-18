import { UseQuantumElementType, UseQuantumElement } from "../document-element";
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

export function useExpressionElementType(
  component: any
): UseQuantumElementType<UseExpressionElement> {
  return {
    type: ElementType,
    component: component,
    useElement: useExpressionElement,
    serializeElement: serializeElement,
    deserializeElement: deserializeElement,
  };
}

// TODO: Function to connect it to a variable/expression tree
// - computed(() => []) // Array of variables that this expression references
// - clear result after the expression gets changed
// - (darkning/blurring the result can be done in the .vue component)
