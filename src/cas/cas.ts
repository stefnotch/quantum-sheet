import { v4 as uuidv4 } from "uuid";
import { usePyodide } from "./pyodide-cas";

export interface UseCas {
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
  readonly callback: (result: any) => void;

  constructor(
    gettersData: Map<string, any>,
    expression: any,
    callback: (result: any) => void
  ) {
    this.id = uuidv4();
    this.gettersData = gettersData;
    this.expression = expression;
    this.callback = callback;
  }
}

export function useCas(): UseCas {
  const cas = usePyodide();

  /*function evaluateExpression(expression: any, gettersData: ReadonlyMap<string, any>, options?: {
    signal?: AbortController
  }): Promise<CasResponse> {
    // And the CasResponse can: Stream some results + progress, return a single result, etc.
  }*/

  function executeCommand(command: CasCommand) {
    console.log("Executing", command);
    cas.executeCommand(command);
  }

  function cancelCommand(command: CasCommand) {
    cas.cancelCommand(command);
  }

  return {
    executeCommand,
    cancelCommand,
  };
}
