import type {} from "vite";
import type { CasCommand } from "./cas";

type WorkerMessage = {
  id: string;
  data: {
    [key: string]: any;
  };
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
      done: boolean;
    }
  | {
      type: "error";
      id: string;
      message: string;
    };

function usePythonNameConverter() {
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
  return {
    encodeName,
    decodeName,
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

  const { encodeName, decodeName } = usePythonNameConverter();
  const commands = new Map<string, CasCommand>();

  const commandBuffer: WorkerMessage[] = [];

  worker.onmessage = async (e) => {
    let response = e.data as WorkerResponse;
    console.log(response);
    if (response.type == "initialized") {
      worker.postMessage({
        id: "",
        data: {},
        command: "import sympy\n",
      } as WorkerMessage);
      isInitialized = true;
      commandBuffer.forEach((v) => sendCommand(v));
      commandBuffer.length = 0;
      return;
    }

    const command = commands.get(response.id);

    if (response.type == "result") {
      // TODO: command?.callback(response.data);
      if (response.done) {
        commands.delete(response.id);
      }
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

    let pythonCode = "";
    // Only parse the expression if there is an "Equal" or "Assign" at the root
    if (command.expression[0] == "Assign") {
      pythonCode = `str(${handleExpression(command.expression[2])}.evalf())`;
    } else if (
      command.expression[0] == "Equal" &&
      command.expression[2] === null
    ) {
      pythonCode = `str(${handleExpression(command.expression[1])}.evalf())`;
    } else {
      commands.delete(command.id);
      return;
    }

    function handleExpression(expression: any): string {
      if (Array.isArray(expression)) {
        const functionName = expression[0];
        let pythonFunctionName = "";
        if (functionName == "Add") {
          pythonFunctionName = "sympy.Add";
        } else {
          pythonFunctionName = functionName;
        }
        let parameters = [];
        for (let i = 1; i < expression.length; i++) {
          parameters.push(handleExpression(expression[i]));
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

    let data = {} as { [key: string]: any };
    command.gettersData.forEach((value, key) => {
      data[encodeName(key)] = value;
    });
    console.log("Python", pythonCode);
    sendCommand({
      id: command.id,
      data: data,
      command: pythonCode,
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
