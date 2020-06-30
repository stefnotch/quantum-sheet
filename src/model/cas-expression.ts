import { reactive } from "vue";
import { v4 as uuidv4 } from "uuid";
import { CASElement } from "./cas-element";
import { CASScope } from "./cas-document";

export interface CASExpression {
  data: any; // LaTeX data
  expression: Readonly<any>; // TODO: MathJSON type
  error?: Error;
  result?: Readonly<any>; // TODO: MathJSON
}

export function useCasExpressionState(): CASElement<"expression"> {
  const element = reactive({
    id: uuidv4(),
    type: "expression",
    data: {
      data: undefined,
      expression: [],
    },
    scope: null,
    position: { x: 0, y: 0 },
  } as CASElement<"expression">);

  return element;
}

export function useCasExpression(
  element: CASElement<"expression">,
  scope: CASScope
) {
  return {
    element,
  };
}
