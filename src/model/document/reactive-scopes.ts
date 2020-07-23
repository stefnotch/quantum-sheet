import { reactive, Ref } from "vue";
import { Vec2 } from "../vectors";
import { exposeState, getState, ReadonlyState } from "../expose-state";

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

export function useReactiveScopes() {
  const rootScope = reactive({
    name: "",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
    closed: true,
    variables: new Map<string, Variable[]>(),
    childScopes: [],
    parentScope: undefined,
  } as QuantumScope);

  function setName(scope: ReadonlyState<QuantumScope>, value: string) {
    let internalState = getState(scope);
    internalState.name = value;
  }

  function setStartPosition(scope: ReadonlyState<QuantumScope>, value: Vec2) {
    let internalState = getState(scope);
    internalState.startPosition = value;
  }

  function setEndPosition(scope: ReadonlyState<QuantumScope>, value: Vec2) {
    let internalState = getState(scope);
    internalState.endPosition = value;
  }

  // TODO: Child scopes

  return {
    rootScope: exposeState(rootScope),
    setName,
    setStartPosition,
    setEndPosition,
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
