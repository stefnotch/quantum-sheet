export function usePyodideWorker() {
  let worker: Worker = (window as any)["pyodide-worker"];
  if (!worker) {
    console.log("Creating pyodide worker");
    worker = new Worker(`${process.env.BASE_URL}pyodide-webworker.js`);
    (window as any)["pyodide-worker"] = worker;
  }

  return {
    worker,
  };
}
