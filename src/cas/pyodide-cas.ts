import type {} from "vite";
import type { CasCommand } from "./cas";
import mathlive from "mathlive";

type WorkerMessage =
  | {
      type: "python";
      id: string;
      data: {
        [key: string]: any;
      };
      command: any;
    }
  | {
      type: "expression";
      id: string;
      data: {
        [key: string]: any;
      };
      symbols: string[];
      command: any;
    };

type WorkerResponse =
  | {
      type: "initialized";
    }
  | {
      type: "result";
      id: string;
      data: any;
    }
  | {
      type: "error";
      id: string;
      message: string;
    };

function usePythonConverter() {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  // Using 16 characters to encode utf-8. So, 2 chars per byte.
  const charOffset = "A".charCodeAt(0);
  function encodeName(name: string) {
    const data = textEncoder.encode(name);
    let output = "";
    for (let i = 0; i < data.length; i++) {
      const highBits = (data[i] >> 4) & 0x0f;
      const lowBits = data[i] & 0x0f;
      output +=
        String.fromCharCode(highBits + charOffset) +
        String.fromCharCode(lowBits + charOffset);
    }

    return "_" + output;
  }

  function decodeName(name: string) {
    name = name.slice(1);
    const output = new Uint8Array(name.length / 2);
    for (let i = 0; i < name.length; i += 2) {
      const highBits = name.charCodeAt(i - charOffset);
      const lowBits = name.charCodeAt(i + 1 - charOffset);
      output[i / 2] = (highBits << 4) | lowBits;
    }
    return textDecoder.decode(output);
  }

  function expressionToPython(expression: any): string {
    if (Array.isArray(expression)) {
      const functionName = expression[0];
      let pythonFunctionName = "";
      let parameters = [];

      if (functionName == "Add") {
        pythonFunctionName = "sympy.Add";
      } else if (functionName == "Subtract") {
        pythonFunctionName = "Subtract"; // TODO: Negate the second parameter
      } else if (functionName == "Negate") {
        pythonFunctionName = "sympy.Mul";
        parameters.push(-1);
      } else if (functionName == "Multiply") {
        pythonFunctionName = "sympy.Mul";
      } else if (functionName == "Divide") {
        pythonFunctionName = "Divide"; // TODO: Raise the second parameter to the power of -1
      } else if (functionName == "Power") {
        pythonFunctionName = "sympy.Pow";
      } else if (functionName == "Sqrt") {
        pythonFunctionName = "Sqrt"; // TODO: Replace with power
      } else {
        pythonFunctionName = functionName;
      }
      for (let i = 1; i < expression.length; i++) {
        parameters.push(expressionToPython(expression[i]));
      }
      return `${pythonFunctionName}(${parameters.join(",")})`;
    } else if (typeof expression === "string") {
      return encodeName(expression);
    } else if (typeof expression === "number") {
      return `sympy.Float(${expression})`;
    } else if (expression === null) {
      return `None`;
    } else {
      // TODO: Make sure to handle all cases (string, number, bool, array, object, ...)
      console.warn("Unknown element type", { x: expression });
      return "";
    }
  }

  const fakeDictionary = new Proxy(
    { fakeKey: 1 },
    {
      get(target, name) {
        console.error("Tried to access a dictionary key");
        throw new Error("Tried to access a dictionary key");
      },
    }
  );

  return {
    encodeName,
    decodeName,
    expressionToPython: (expression: any) =>
      expressionToPython(
        mathlive.form(fakeDictionary as any, expression, [
          "canonical-root",
          "canonical-subtract",
          "canonical-divide",
        ])
      ),
  };
}

// TODO: Fix this
export function usePyodide() {
  let worker: Worker = (window as any)["pyodide-worker"];
  let isInitialized = true;
  if (!worker) {
    console.log("Creating pyodide worker");
    worker = new Worker(`${import.meta.env.BASE_URL}pyodide-webworker.js`);
    (window as any)["pyodide-worker"] = worker;
    isInitialized = false;
  }

  const { encodeName, decodeName, expressionToPython } = usePythonConverter();
  const commands = new Map<string, CasCommand>();

  const commandBuffer: WorkerMessage[] = [];

  worker.onmessage = async (e) => {
    let response = e.data as WorkerResponse;
    console.log("Response", response);
    if (response.type == "initialized") {
      isInitialized = true;
      commandBuffer.forEach((v) => sendCommand(v));
      commandBuffer.length = 0;
      return;
    }

    const command = commands.get(response.id);

    if (response.type == "result") {
      command?.callback(JSON.parse(response.data));
      commands.delete(response.id);
    } else if (response.type == "error") {
      console.warn(response);
      commands.delete(response.id);
    } else {
      console.error("Unknown response type", response);
    }
  };

  worker.onerror = async (e) => {
    console.warn("Worker error", e);
  };

  worker.onmessageerror = async (e) => {
    console.error("Message error", e);
  };

  function executeCommand(command: CasCommand) {
    commands.set(command.id, command);

    const symbolNames = Array.from(command.gettersData.keys()).map((key) =>
      encodeName(key)
    );

    const substitutions = Array.from(command.gettersData.entries())
      .map(([key, value]) => `${encodeName(key)}:${expressionToPython(value)}`)
      .join(",");

    let pythonExpression = "";
    // Only parse the expression if there is an "Equal" or "Solve" or "Apply" at the root
    if (command.expression[0] == "Equal") {
      // TODO: If the expression is only a single getter or something simple, don't call the CAS
      pythonExpression = `${expressionToPython(
        command.expression[1]
      )}\n\t.subs({${substitutions}})\n\t.evalf()`;
    } else {
      commands.delete(command.id);
      return;
    }

    console.log("Python expression", pythonExpression);
    sendCommand({
      type: "expression",
      id: command.id,
      data: {},
      symbols: symbolNames,
      command: pythonExpression,
    } as WorkerMessage);
  }

  function cancelCommand(command: CasCommand) {
    if (commands.delete(command.id)) {
      // TODO: Interrupt worker
    }
  }

  function sendCommand(command: WorkerMessage) {
    if (!isInitialized) {
      commandBuffer.push(command);
    } else {
      worker.postMessage(command);
    }
  }

  return {
    executeCommand,
    cancelCommand,
  };
}
