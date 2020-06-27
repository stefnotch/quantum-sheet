import { usePyodideWorker } from "./pyodide-cas-worker";
import type { CAS, CASRawCommand } from "./cas";

export interface PyodideCas extends CAS {}

interface WorkerResponse {
  type: "result";
  data: any;
  error?: any;
}

export function usePyodide(
  nextCommands: AsyncGenerator<CASRawCommand, void, unknown>
): PyodideCas {
  let { worker } = usePyodideWorker();

  worker.onerror = async (e) => {
    let response = e.error;
    console.log(response); // TODO: Error

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand as CASRawCommand);
  };

  worker.onmessage = async (e) => {
    let response = e.data as WorkerResponse;
    console.log(response);

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand as CASRawCommand);
  };

  worker.onmessageerror = async (e) => {
    let response = e.data;
    console.log(response); // TODO: Error

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand as CASRawCommand);
  };

  /*
  sendRawCommand({
    command: "import statistics\n",
  });
  sendRawCommand({
    data: {
      A_rank: [0.8, 0.4, 1.2, 3.7, 2.6, 5.8],
    },
    command: "from js import A_rank\n",
  });*/
  /*sendRawCommand({
    command: "statistics.stdev(A_rank)\n",
  });*/

  return {};
}
