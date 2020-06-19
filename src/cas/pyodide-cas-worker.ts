export function usePyodideWorker() {
  const worker: Worker =
    (window as any)["pyodide-worker"] ??
    ((window as any)["pyodide-worker"] = new Worker(
      `${process.env.BASE_URL}pyodide-webworker.js`
    ));

  return {
    worker,
  };
}
