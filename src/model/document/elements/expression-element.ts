import { QuantumElemement } from "../element";
import { readonly, reactive } from "vue";
import { v4 as uuidv4 } from "uuid";

export const ElementType = "expression-element";

type MathJSON = Readonly<any>;

export interface ExpressionElement extends QuantumElemement {
  readonly type: typeof ElementType;
  expression: MathJSON;
  result: MathJSON;
}

export function useExpressionElementState(): ExpressionElement {
  let state = reactive<ExpressionElement>({
    id: uuidv4(),
    type: ElementType,
    position: { x: 0, y: 0 },
    size: { x: 0, y: 0 },
    resizeable: false,
    expression: [],
    result: [],
  });

  return state;
}

// TODO: Function to connect it to a variable/expression tree
// - computed(() => []) // Array of variables that this expression references
// - clear result as soon as the expression gets changed
//export function ???(element: ExpressionElement, variableTree:)

export function useExpressionElement(element: ExpressionElement) {}
