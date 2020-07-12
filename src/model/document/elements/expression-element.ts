import { QuantumElemement, QuantumElementFunctions } from "../document-element";
import { readonly, reactive, Ref } from "vue";

export const ElementType = "expression-element";

type MathJSON = Readonly<any>;

export interface ExpressionElement extends QuantumElemement {
  expression: MathJSON;
}

export const ElementFunctions: QuantumElementFunctions = {
  createElement: function () {
    return reactive({ expression: [], result: [] });
  },
  // TODO: Implement serialization
  serializeElement: function (element) {
    throw new Error(`Serialization not implemented yet`);
  },
  deserializeElement: function (data) {
    throw new Error(`Serialization not implemented yet`);
  },
};

// TODO: Function to connect it to a variable/expression tree
// - computed(() => []) // Array of variables that this expression references
// - clear result after the expression gets changed
// - (darkning/blurring the result can be done in the .vue component)
//export function ???(element: ExpressionElement, variableTree:)

export function useExpressionElement(element: ExpressionElement) {}
