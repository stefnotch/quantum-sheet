import type {} from "vite";

interface WorkerResponse {
  type: "result";
  data: any;
  error?: any;
}

// TODO: Fix this
export function usePyodide(nextCommands: AsyncGenerator<any, void, unknown>) {
  let worker: Worker = (window as any)["pyodide-worker"];
  if (!worker) {
    console.log("Creating pyodide worker");
    worker = new Worker(`${import.meta.env.BASE_URL}pyodide-webworker.js`);
    (window as any)["pyodide-worker"] = worker;
  }

  worker.onerror = async (e) => {
    let response = e.error;
    console.log(response); // TODO: Error

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand);
  };

  worker.onmessage = async (e) => {
    let response = e.data as WorkerResponse;
    console.log(response);

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand);
  };

  worker.onmessageerror = async (e) => {
    let response = e.data;
    console.log(response); // TODO: Error

    let nextCommand = (await nextCommands.next()).value;
    worker.postMessage(nextCommand);
  };

  /**
   * Adds a command to the internal commands queue
   */
  /*
  addCommand(command) {

    function cancel() {
      // TODO: If the command is already being executed, interrupt execution

    }

    return {
      cancel
    }
  }*/
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
