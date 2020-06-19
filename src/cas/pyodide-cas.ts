import { usePyodideWorker } from "./pyodide-cas-worker";

export function usePyodide() {
  let { worker } = usePyodideWorker();
  worker.addEventListener("error", (e) => {
    console.error(e);
  });

  worker.addEventListener("message", (e) => {
    console.log(e);
  });

  worker.postMessage({
    A_rank: [0.8, 0.4, 1.2, 3.7, 2.6, 5.8],
    python: "import statistics\n",
  });

  worker.postMessage({
    A_rank: [0.8, 0.4, 1.2, 3.7, 2.6, 5.8],
    python: "from js import A_rank\n",
  });

  worker.postMessage({
    A_rank: [0.8, 0.4, 1.2, 3.7, 2.6, 5.8],
    python: "statistics.stdev(A_rank)\n",
  });
  // TODO: Return something that implements the CAS interface
  return {
    worker,
  };
}
