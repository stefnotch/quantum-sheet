import { usePyodideWorker } from "./pyodide-cas-worker";

export function usePyodide() {
  let { worker } = usePyodideWorker();
  worker.addEventListener("error", (e) => {
    console.error(e);
  });

  worker.addEventListener("message", (e) => {
    console.log(e);
  });

  // pyodide-data.json
}
