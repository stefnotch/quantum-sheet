// Relative paths are fine here

self.languagePluginUrl = "./pyodide/";
importScripts("./pyodide/pyodide.js");

languagePluginLoader
  .then(() => self.pyodide.loadPackage(["sympy", "mpmath"]))
  .then(() => self.postMessage({ type: "result", data: undefined }));

self.onmessage = (event) => {
  let message = event.data;

  if (message?.data) {
    Object.keys(message.data).forEach((key) => {
      // Set them on self, so that `from js import key` works.
      self[key] = message.data[key];
    });
  }

  let pyodideResult = self.pyodide.runPython(message.command);

  self.postMessage({
    type: "result",
    data: pyodideResult,
  });
};
