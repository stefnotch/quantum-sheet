import {
  Ref,
  ComputedRef,
  computed,
  watch,
  watchEffect,
  reactive,
  ref,
  readonly,
  UnwrapRef,
} from "vue";

import { v4 as uuidv4 } from "uuid";

export interface CASScope {
  /**
   * Variables in this scope
   */
  variables: CASVariable[];

  /**
   * Elements in this scope
   */
  elements: Readonly<CASElement<keyof CASElementChild>[]>;

  /**
   * Child scopes
   */
  childScopes: Readonly<CASScope[]>;

  /**
   * Parent scope
   */
  readonly scope: CASScope | null;

  /**
   * Offset from the start of the parent scope in lines
   */
  scopeOffset: number;

  /**
   * Length of the scope in lines
   */
  length: number;
}

export interface CASVariable {
  name: string;
  data: Ref<Readonly<any>>; // TODO: MathJSON type
}

export interface CASElement<T extends keyof CASElementChild> {
  /**
   * A v4 UUID that uniquely identifies this element
   */
  readonly id: string;

  /**
   * Type of this element
   */
  type: T;

  /**
   * Expression, text or graph
   */
  data: CASElementChild[T];

  /**
   * Parent scope
   */
  readonly scope: CASScope | null;

  /**
   * Offset from the start of the scope in lines
   */
  position: {
    // TODO: Use this to figure out which page to put the element in
    x: number;
    y: number;
  };
}

export type CASElementChild = {
  expression: CASExpression;
};

export interface CASExpression {
  data: any; // LaTeX data
  expression: Readonly<any>; // TODO: MathJSON type
  error?: Error;
  result?: Readonly<any>; // TODO: MathJSON
}

export function useCASDocument() {
  // TODO: Save
  // TODO: Load
  const documentScope: CASScope = reactive({
    variables: [],
    elements: [],
    childScopes: [],
    scope: null,
    scopeOffset: 0,
    length: 1,
  });

  // TODO: Get *next* expression that needs to be updated!

  // TODO: Expose a readonly state
  return {
    documentScope: documentScope,
  };
}

export function useScope(scope: CASScope) {
  /**
   * Adds a new scope at the given position
   */
  function addChildScope(scopeOffset: number) {
    const newScope: CASScope = {
      variables: [],
      elements: [],
      childScopes: [],
      scope: scope,
      scopeOffset: scopeOffset,
      length: 1,
    };

    (scope.childScopes as CASScope[]).push(newScope);

    return newScope;
  }

  /**
   * Remove a child scope
   */
  function removeChildScope(childScope: CASScope) {
    const index = scope.childScopes.indexOf(childScope);
    if (index && index >= 0) {
      (scope.childScopes as CASScope[]).splice(index, 1);
      (childScope.scope as any) = null;
    }
  }

  /**
   * Adds a element at the given position
   */
  function addChildElement<T extends keyof CASElementChild>(
    element: CASElement<T>,
    position: { x: number; y: number }
  ) {
    (element.scope as any) = scope;
    element.position.x = position.x;
    element.position.y = position.y;
    (scope.elements as CASElement<keyof CASElementChild>[]).push(element);

    return element;
  }

  /**
   * Removes a child element
   */
  function removeChildElement<T extends keyof CASElementChild>(
    element: CASElement<T>
  ) {
    const index = scope.elements.indexOf(element);
    if (index && index >= 0) {
      (scope.elements as CASElement<keyof CASElementChild>[]).splice(index, 1);
      (element.scope as any) = null;
    }
  }

  return {
    addChildScope,
    removeChildScope,
    addChildElement,
    removeChildElement,
  };
}

export function useCasExpression(element?: CASElement<"expression">) {
  if (!element) {
    element = reactive({
      id: uuidv4(),
      type: "expression",
      data: {
        data: undefined,
        expression: [],
      },
      scope: null,
      position: { x: 0, y: 0 },
    } as CASElement<"expression">);
  }

  return {
    element,
  };
}
