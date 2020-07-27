import { reactive, Ref } from "vue";
import { Vec2 } from "../vectors";
import { exposeState, getState, ReadonlyState } from "../expose-state";
import { compare as compareVector2 } from "../vectors";

export interface UseQuantumScopes {
  /**
   * Reactive root scope
   */
  rootScope: ReadonlyState<QuantumScope>;

  setName(scope: ReadonlyState<QuantumScope>, value: string): void;
  setStartPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;
  setEndPosition(scope: ReadonlyState<QuantumScope>, value: Vec2): void;

  getScope(value: Vec2): QuantumScope;
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
  value: Ref<Readonly<any>>;

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
  // TODO: Child scopes

  return {
    rootScope: exposeState(rootScope),
    setName,
    setStartPosition,
    setEndPosition,
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
