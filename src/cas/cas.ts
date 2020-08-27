import { v4 as uuidv4 } from "uuid";
import { usePyodide } from "./pyodide-cas";

export interface UseCas {
  parseExpression(
    value: any
  ):
    | {
        getters: Set<string>;
        variables: Set<string>;
        parsedExpression: any;
      }
    | undefined;

  executeCommand(command: CasCommand): void;

  cancelCommand(command: CasCommand): void;
}

export class CasCommand {
  readonly id: string;
  readonly gettersData: Map<string, any>;
  readonly expression: any;
  /**
   * NOTE: This callback can be called multiple times
   * (like, when you have x*3=7^y --solve,y--> ... --expand--> ... --collect,x--> ...)
   */
  readonly callback: (result: {
    variables: { name: string; data: any }[];
    expression: any;
  }) => void;

  constructor(
    gettersData: Map<string, any>,
    expression: any,
    callback: (result: {
      variables: { name: string; data: any }[];
      expression: any;
    }) => void
  ) {
    this.id = uuidv4();
    this.gettersData = gettersData;
    this.expression = expression;
    this.callback = callback;
  }
}

function parseExpression(expression: any) {
  if (!Array.isArray(expression)) return;

  const getters = new Set<string>();
  const variables = new Set<string>();

  // Only parse the expression if there is an "Equal" or "Assign"
  if (expression[0] == "Assign") {
    variables.add(expression[1]);
    handleExpression(expression[2]);
  } else if (expression[0] == "Equal" && expression[2] === null) {
    handleExpression(expression[1]);
  } else {
    return;
  }

  // Eh, a recursive solution is fine for now
  function handleExpression(expression: any) {
    if (Array.isArray(expression)) {
      const functionName = expression[0];
      for (let i = 1; i < expression.length; i++) {
        handleExpression(expression[i]);
      }
    } else if (typeof expression === "string") {
      getters.add(expression);
    } else if (typeof expression === "number") {
    } else if (expression === null) {
    } else {
      // TODO: Make sure to handle all cases (string, number, bool, array, object, ...)
      console.warn("Unknown element type", { x: expression });
    }
  }

  return {
    getters: getters,
    variables: variables,
    parsedExpression: expression,
  };
}

export function useCas(): UseCas {
  const cas = usePyodide();

  function executeCommand(command: CasCommand) {
    console.log("Executing", command);

    cas.executeCommand(command);
  }

  function cancelCommand(command: CasCommand) {
    cas.cancelCommand(command);
  }

  return {
    parseExpression,
    executeCommand,
    cancelCommand,
  };
}
