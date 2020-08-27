// Relative paths are fine here

self.languagePluginUrl = "./pyodide/";
importScripts("./pyodide/pyodide.js");

languagePluginLoader
  .then(() => self.pyodide.loadPackage(["sympy", "mpmath"]))
  .then(() => self.postMessage({ type: "initialized" }));

self.onmessage = (event) => {
  const command = event.data;

  if (command?.data) {
    Object.keys(command.data).forEach((key) => {
      // Set them on self, so that `from js import key` works.
      self[key] = command.data[key];
    });
  }

  let aa;
  try {
    let pyodideResult = self.pyodide.runPython(command.command);
    if (pyodideResult?.destroy) {
      throw new Error("A proxy object was created"); // TODO: Better error handling
      //pyodideResult.destroy();
      //pyodideResult = undefined;
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
