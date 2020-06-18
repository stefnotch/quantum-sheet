const pyodideWorker = new Worker(`${process.env.BASE_URL}pyodide-webworker.js`);

pyodideWorker.addEventListener("error", (e) => {
  console.error(e);
});

pyodideWorker.addEventListener("message", (e) => {
  console.log(e);
});

export { pyodideWorker };
/*
// @ts-ignore
window["languagePluginUrl"] = `${process.env.BASE_URL}pyodide/`;

const loaderPromise = new Promise((resolve, reject) => {
  let loaderScript = document.createElement("script");
  loaderScript.addEventListener("load", (event) => {
    // @ts-ignore
    let languagePluginLoader = window["languagePluginLoader"] as any;
    if (languagePluginLoader) {
      languagePluginLoader.then(() => {
        // @ts-ignore
        let pyodide = window["pyodide"] as Pyodide;
        if (pyodide) {
          console.log("Loaded pyodide and sympy");
          resolve(pyodide);
        } else {
          reject("Failed to load, missing pyodide");
        }
      });
    } else {
      reject("Failed to load, missing window.languagePluginLoader");
    }
  });
  loaderScript.addEventListener("error", (error) => {
    reject(error);
  });
  loaderScript.src = `${process.env.BASE_URL}pyodide/pyodide.js`;
  document.head.appendChild(loaderScript);
});

export { loaderPromise };
*/
