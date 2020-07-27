import { reactive, Ref, shallowRef, watch } from "vue";
import { Vec2 } from "../vectors";
import { exposeState, getState, ReadonlyState } from "../expose-state";
import * as vector2 from "../vectors";
import { getDepHash } from "vite";
import { getBinaryInsertIndex } from "../utils";

export interface UseQuantumScopes {
  /**
   * Reactive root scope
   */
  rootScope: ReadonlyState<QuantumScope>;

  setName(scope: ReadonlyState<QuantumScope>, value: string): void;
  setStartPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;
  setEndPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;

  getScope(value: Vec2): QuantumScope;

  addVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    position: Vec2
  ): ReadonlyState<Variable>;
  removeVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    variable: ReadonlyState<Variable>
  ): void;
  setVariablePosition(variable: ReadonlyState<Variable>, value: Vec2): void;
  setVariableValue(
    variable: ReadonlyState<Variable>,
    value: Readonly<any> | undefined
  ): void;
}

export interface QuantumScope {
  /**
   * Name of the scope, used for named imports
   */
  name: string;

  /**
   * Absolute start position
   */
  startPosition: Vec2;

  /**
   * Absolute end position
   */
  endPosition: Vec2;

  /**
   * A closed scope does not auto-import variables from its parent scope
   */
  closed: boolean;

  /**
   * Variables defined in this scope
   */
  variables: Map<string, Variable[]>;

  /**
   * Child scopes
   */
  childScopes: QuantumScope[];

  /**
   * Parent scope
   */
  parentScope?: QuantumScope;
}

export interface Variable {
  /**
   * Variable position
   */
  position: Vec2;

  /**
   * Shallow ref variable value
   */
  value: Readonly<any> | undefined;

  /**
   * Callback whenever the variable or value changes
   */
  getters: ((variable: Variable) => void)[];
}

export function useReactiveScopes(): UseQuantumScopes {
  const rootScope = reactive({
    name: "root",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: Infinity, y: Infinity },
    closed: true,
    variables: new Map<string, Variable[]>(),
    childScopes: [],
    parentScope: undefined,
  } as QuantumScope);

  function setName(scope: ReadonlyState<QuantumScope>, value: string) {
    getState(scope).name = value;
  }

  function setStartPosition(scope: ReadonlyState<QuantumScope>, value: Vec2) {
    getState(scope).startPosition = value;
  }

  function setEndPosition(scope: ReadonlyState<QuantumScope>, value: Vec2) {
    getState(scope).endPosition = value;
  }

  function getScope(value: Vec2): QuantumScope {
    let currentScope = rootScope;
    while (true) {
      const childScope = currentScope.childScopes.find(
        (s) =>
          s.startPosition.x <= value.x &&
          value.x < s.endPosition.x &&
          s.startPosition.y <= value.y &&
          value.y < s.endPosition.y
      );
      if (childScope) {
        currentScope = childScope;
      } else {
        break;
      }
    }
    return currentScope;
  }

  // TODO: While I'm not handling nested scopes,
  //  I do have to auto-magically add variables with a value = undefined at the scope root when someone is trying to get an undefined variable
  // Otherwise, things like "simply get a few getters of the previous variable when adding a new one" won't work
  function addVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    position: Vec2
  ): ReadonlyState<Variable> {
    const existingVariables = getState(scope).variables.get(name) ?? [];
    const insertPosition = getBinaryInsertIndex(existingVariables, (v) =>
      vector2.compare(v.position, position)
    );

    // Add setter
    // TODO: Handle the grabbing of existing getters from the previous variable
    const variable = reactive<Variable>({
      position: position,
      value: shallowRef(),
      getters: [],
    });

    watch(
      () => variable.value,
      (value) => {
        variable.getters.forEach((getter) => getter(variable));
      }
    );

    existingVariables.splice(
      insertPosition < 0 ? -(insertPosition + 1) : insertPosition,
      0,
      variable
    );

    return exposeState(variable);
  }

  function removeVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    variable: ReadonlyState<Variable>
  ) {
    const existingVariables = getState(scope).variables.get(name) ?? [];

    const variableIndex = existingVariables.indexOf(getState(variable));

    if (variableIndex >= 0) {
      // Remove setter
      // TODO: Give all getters to the previous setter
      existingVariables.splice(variableIndex, 1);
    }
  }

  function setVariablePosition(variable: ReadonlyState<Variable>, value: Vec2) {
    getState(variable).position = value;
  }

  function setVariableValue(
    variable: ReadonlyState<Variable>,
    value: Readonly<any> | undefined
  ) {
    getState(variable).value = value;
  }

  // TODO: Add getter (find variable and add getter, then call the getter callback once) GetVariableValue(): ((variable) => void)
  // TODO: Remove getter (find variable and remove getter)

  // TODO: Child scopes

  return {
    rootScope: exposeState(rootScope),
    setName,
    setStartPosition,
    setEndPosition,
    addVariable,
    removeVariable,
    setVariablePosition,
    setVariableValue,
    getScope,
  };
}

/*
Cases:
- Get variables (all) at position 
- Get variable (singular) at position
- Add getter
(- Move getter)
- Remove getter
- Add variable
(- Move variable)
- Remove variable


XYElement {
  <already in code>
  computeExpression // goes to CAS and tells it to put an expression in its "recompute queue" at a certain position
}

// Has the methods above ^
ExpressionElement {
  expression
  expressionVariables // computed from expression (getters)
  variableGetters // from getVariable
  variableSetters // from setVariable
}

scope {
  setters
  childScopes
}*/
