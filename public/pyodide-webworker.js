// Relative paths are fine here

self.languagePluginUrl = "./pyodide/";
importScripts("./pyodide/pyodide.js");

languagePluginLoader
  .then(() => self.pyodide.loadPackage(["mpmath", "sympy"]))
  .then(() => {
    self.pyodide.runPython(`sys.setrecursionlimit(999)
import sympy`);
    self.postMessage({ type: "initialized" });
  });

self.onmessage = (event) => {
  const command = event.data;

  if (command?.data) {
    Object.keys(command.data).forEach((key) => {
      // Set them on self, so that `from js import key` works.
      self[key] = command.data[key];
    });
  }

  try {
    let pyodideResult = self.pyodide.runPython(command.command);
    if (pyodideResult?.destroy) {
      console.warn("Pyodide returned a proxy", pyodideResult.toString()); // Internally calls repr()
      console.warn(Reflect.ownKeys(pyodideResult)); // Lists all properties and methods
      //console.warn(pyodideResult.__doc__) // Shows the documentation string
      pyodideResult.destroy();
      pyodideResult = undefined;
    }
    self.postMessage({
      type: "result",
      id: command.id,
      data: pyodideResult,
      done: true,
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      id: command.id,
      message: `Command ${command.command} resulted in an error ${e.message}`,
    });
  }
};
