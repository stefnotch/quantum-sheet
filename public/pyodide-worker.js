// Relative paths are fine here

/**
 * @typedef { import("../src/cas/pyodide-cas").WorkerMessage } WorkerMessage
 */
/**
 * @typedef { import("../src/cas/pyodide-cas").WorkerResponse } WorkerResponse
 */

// TODO: Use new Pyodide APIs https://pyodide.org/en/stable/project/changelog.html#version-0-17-0
self.languagePluginUrl = "./pyodide/";
self.importScripts("./pyodide/pyodide.js");

const loadPyodide = self.languagePluginLoader
  .then(() => self.pyodide.loadPackage(["mpmath", "sympy"]))
  .then(() =>
    fetch("./mathjson.py")
      .then((response) => response.text())
      .then((v) => {
        self.pyodide.runPython("sys.setrecursionlimit(999)");
        self.pyodide.runPython(v);
      })
  )
  .then(() => {
    self.pyodide.runPython(`sys.setrecursionlimit(999)
import sympy`);
  })
  .catch((error) => console.error(error));

if (self.SharedWorkerGlobalScope) {
  self.onconnect = (/**@type {MessageEvent} */ event) => {
    const messagePort = event.ports[0];
    messagePort.onmessage = function (event) {
      messagePort.postMessage(messageHandler(event));
    };
    loadPyodide.then(() => messagePort.postMessage({ type: "initialized" }));
  };
} else if (self.WorkerGlobalScope) {
  self.onmessage = function (event) {
    self.postMessage(messageHandler(event));
  };
  loadPyodide.then(() => self.postMessage({ type: "initialized" }));
} else {
  console.error("Please use this script in a web worker or shared worker");
}

/**
 *
 * @param {string[]} symbols
 * @param {string} command
 */
function wrapSympyCommand(symbols, command) {
  const argumentNames = symbols.join(",");
  const argumentValues = symbols.map((v) => `sympy.Symbol('${v}')`).join(",");
  return `MathJsonPrinter().doprint((lambda ${argumentNames}: ${command})(${argumentValues}))`;
}

/**
 *
 * @param {MessageEvent} event
 * @returns {WorkerResponse}
 */
function messageHandler(event) {
  /** @type {WorkerMessage} */
  const message = event.data;
  if (!message) return;

  try {
    let pyodideResult = undefined;

    if (message.type == "python") {
      if (message.data) {
        Object.keys(message.data).forEach((key) => {
          // Set them on self, so that `from js import key` works.
          self[key] = message.data[key];
        });
      }
      pyodideResult = self.pyodide.runPython(message.command);
    } else if (message.type == "expression") {
      pyodideResult = self.pyodide.runPython(
        wrapSympyCommand(message.symbols, message.command)
      );
    } else {
      throw new Error("Unknown command type", message);
    }

    if (pyodideResult?.destroy) {
      console.warn("Pyodide returned a proxy", pyodideResult.toString()); // Internally calls repr()
      console.warn(Reflect.ownKeys(pyodideResult)); // Lists all properties and methods
      //console.warn(pyodideResult.__doc__) // Shows the documentation string
      pyodideResult.destroy();
      pyodideResult = undefined;
    }

    return {
      type: "result",
      id: message.id,
      data: pyodideResult,
    };
  } catch (e) {
    return {
      type: "error",
      id: message.id,
      message: `Command ${message.command} resulted in an error ${e.message}`,
    };
  }
}
