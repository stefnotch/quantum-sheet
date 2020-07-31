import { reactive, Ref, shallowRef, watch } from "vue";
import { Vec2 } from "../vectors";
import { exposeState, getState, ReadonlyState } from "../expose-state";
import * as vector2 from "../vectors";
import { getBinaryInsertIndex } from "../utils";

// Huh, wouldn't classes almost be neater fur this..?

export interface UseQuantumScopes {
  /**
   * Reactive root scope
   */
  rootScope: ReadonlyState<QuantumScope>;

  setName(scope: ReadonlyState<QuantumScope>, value: string): void;
  setStartPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;
  setEndPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;

  getScope(value: Vec2): ReadonlyState<QuantumScope>;

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
   * Variable index in array
   */
  index: number;

  /**
   * Shallow ref variable value
   */
  value: Readonly<any> | undefined;

  /**
   * Callback whenever the variable or value changes
   */
  getters: VariableGetter[];
}

export interface VariableGetter {
  position: Vec2;
  callback(variable: ReadonlyState<Variable>): void;
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

  function getScope(value: Vec2): ReadonlyState<QuantumScope> {
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

  function addVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    position: Vec2
  ): ReadonlyState<Variable> {
    const internalScope = getState(scope);

    const variable = reactive<Variable>({
      position: position,
      value: shallowRef(),
      getters: [],
      index: -1,
    });

    watch(
      () => variable.value,
      (value) => {
        variable.getters.forEach((getter) => getter.callback(variable));
      }
    );

    watch(
      () => variable.position,
      (value) => {
        const scopeVariables = internalScope.variables.get(name);
        if (!scopeVariables) {
          throw new Error("Missing scope variables");
        }

        // Remove (or bail out)
        if (variable.index >= 0) {
          const index = variable.index;
          if (scopeVariables[index] != variable) {
            throw new Error(
              `Expected variable ${variable} to be in ${scopeVariables} at index ${variable.index}`
            );
          }

          const prev = index - 1 >= 0 ? scopeVariables[index - 1] : undefined;
          const next =
            index + 1 < scopeVariables.length
              ? scopeVariables[index + 1]
              : undefined;
          if (
            (!prev || vector2.compare(prev.position, value) <= 0) &&
            (!next || vector2.compare(value, next.position) < 0)
          ) {
            return;
          }

          if (variable.getters.length > 0) {
            if (!prev) {
              throw new Error("Expected prev variable to exist");
            } else {
              prev.getters = prev.getters.concat(variable.getters);
              variable.getters.forEach((v) => v.callback(prev));
              variable.getters = [];
            }
          }
          scopeVariables.splice(index, 1);
          for (let i = index; i < scopeVariables.length; i++) {
            scopeVariables[i].index = i;
          }
          variable.index = -1;
        }

        // Add
        const insertIndex = getBinaryInsertIndex(scopeVariables, (v) =>
          vector2.compare(v.position, value)
        );
        const index = insertIndex < 0 ? -(insertIndex + 1) : insertIndex;

        const prev = index - 1 >= 0 ? scopeVariables[index - 1] : undefined;
        if (prev?.getters) {
          variable.getters = prev.getters.filter(
            (v) => vector2.compare(value, v.position) <= 0
          );
          variable.getters.forEach((v) => v.callback(variable));
          prev.getters = prev.getters.filter(
            (v) => vector2.compare(v.position, value) < 0
          );
        }
        for (let i = index; i < scopeVariables.length; i++) {
          scopeVariables[i].index = i + 1;
        }
        scopeVariables.splice(index, 0, variable);
        variable.index = index;
      },
      {
        immediate: true,
      }
    );

    return exposeState(variable);
  }

  function removeVariable(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    variable: ReadonlyState<Variable>
  ) {
    const internalScope = getState(scope);
    const internalVariable = getState(variable);
    const scopeVariables = internalScope.variables.get(name);
    if (!scopeVariables) {
      throw new Error("Missing scope variables");
    }

    if (internalVariable.index >= 0) {
      if (internalVariable.getters.length > 0) {
        const prev =
          internalVariable.index - 1 >= 0
            ? scopeVariables[internalVariable.index - 1]
            : undefined;
        if (!prev) {
          throw new Error("Expected prev variable to exist");
        } else {
          prev.getters = prev.getters.concat(internalVariable.getters);
          internalVariable.getters.forEach((v) => v.callback(prev));
          internalVariable.getters = [];
        }
      }
      // Remove variable
      scopeVariables.splice(internalVariable.index, 1);
      internalVariable.index = -1;
    }
  }

  function setVariablePosition(variable: ReadonlyState<Variable>, value: Vec2) {
    getState(variable).position = value;

    // TODO: Furthermore, a variable getter also has a position, right? How do you handle that? Check if the variable setter is still correct?
    // Note: Moving the getter to a new variable ONLY has to be done if the element that owns the getter has been moved (and then has different siblings). All other elements are irrelevant.

    // If I keep track of the variable index, I can easily query its siblings
    // - Moving the variable in the array: Check sibling positions
    // - Moving getter to other variable: Check sibling positions
  }

  function setVariableValue(
    variable: ReadonlyState<Variable>,
    value: Readonly<any> | undefined
  ) {
    getState(variable).value = value;
  }

  // TODO: Add getter (find variable and add getter, then call the getter callback once) GetVariableValue(): ((variable) => void)'
  // TODO: While I'm not handling nested scopes,
  //  I do have to auto-magically add variables with a value = undefined at the scope root when someone is trying to *get* an undefined variable
  // Otherwise, things like "simply get a few getters of the previous variable when adding a new one" won't work

  function addGetter(
    scope: ReadonlyState<QuantumScope>,
    name: string,
    position: Vec2
  ): ReadonlyState<VariableGetter> {
    const internalScope = getState(scope);
    const variables = internalScope.variables.get(name);

    if (!variables) {
      // Add a magical variable
    } else {
      variables?.findIndex();
    }

    // TODO:
    const internalVariable = getState(variable);
    internalVariable.getters.push(getState(getter));
    getter.callback(internalVariable);
  }

  function setGetterPosition() {
    // TODO:
  }

  // This function is fine, because a getter gets the variable in the callback function...
  // (Consider changing this to a ref or computed in the future?)
  function removeGetter(
    variable: ReadonlyState<Variable>,
    getter: ReadonlyState<VariableGetter>
  ) {
    const getters = getState(variable).getters;
    const index = getters.indexOf(getState(getter));
    if (index >= 0) {
      getters.splice(index, 1);
    }

    // TODO: Remove the auto-imported variables
  }

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
*/
