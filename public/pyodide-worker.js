// Relative paths are fine here

/**
 * @typedef { import("../src/cas/pyodide-cas").WorkerMessage } WorkerMessage
 */
/**
 * @typedef { import("../src/cas/pyodide-cas").WorkerResponse } WorkerResponse
 */

/**
 * QuantumSheet Loading Time
Improvements
- Upgrade to Pyodide 0.18.x (fpcast & smoler)
- Preload
- CDN (compressed) with fallback to github pages pyodide

Current Loading Time (without any of the improvements ^)
Everything in cache, just reload: 2.84s, 2.95s, 2.72s, 2.90s
Disable cache: 17.66s, 17.19s, 13.79s, 18.70s
36.20 MB / 23.33 MB transferred
 */

globalThis.importScripts('./pyodide/pyodide.js')

let pyodide = undefined
const loadPyodide = globalThis
  .loadPyodide({
    indexURL: './pyodide/',
    fullStdLib: false, // Don't load the full standard library, hopefully this doesn't cause any issues
  })
  .then(async (pyodide) => {
    const loadPackagePromise = pyodide.loadPackage(['mpmath', 'sympy'])
    const mathjsonPy = await fetch('./mathjson.py').then((v) => v.text())
    await loadPackagePromise
    pyodide.runPython('import sys\nsys.setrecursionlimit(999)\nimport sympy')
    pyodide.runPython(mathjsonPy)
    return pyodide
  })
  .catch((error) => console.error(error))

if (globalThis.SharedWorkerGlobalScope) {
  globalThis.onconnect = (/**@type {MessageEvent} */ event) => {
    const messagePort = event.ports[0]
    messagePort.onmessage = function (event) {
      messagePort.postMessage(messageHandler(event))
    }
    loadPyodide.then((v) => {
      messagePort.postMessage({ type: 'initialized' })
      pyodide = v
    })
  }
} else if (globalThis.WorkerGlobalScope) {
  globalThis.onmessage = function (event) {
    globalThis.postMessage(messageHandler(event))
  }
  loadPyodide.then((v) => {
    globalThis.postMessage({ type: 'initialized' })
    pyodide = v
  })
} else {
  console.error('Please use this script in a web worker or shared worker')
}

/**
 *
 * @param {string[]} symbols
 * @param {string} command
 */
function wrapSympyCommand(symbols, command) {
  const argumentNames = symbols.join(',')
  const argumentValues = symbols.map((v) => `sympy.Symbol('${v}')`).join(',')
  const pyCommand = `MathJsonPrinter().doprint((lambda ${argumentNames}: ${command})(${argumentValues}))`
  return pyCommand
}

/**
 *
 * @param {MessageEvent} event
 * @returns {WorkerResponse}
 */
function messageHandler(event) {
  /** @type {WorkerMessage} */
  const message = event.data
  if (!message) return

  try {
    let pyodideResult = undefined

    if (message.type == 'python') {
      pyodideResult = pyodide.runPython(message.command)
    } else if (message.type == 'expression') {
      pyodideResult = pyodide.runPython(wrapSympyCommand(message.symbols, message.command))
    } else {
      throw new Error('Unknown command type', message)
    }

    if (pyodideResult?.destroy) {
      console.warn('Pyodide returned a proxy', pyodideResult.toString()) // Internally calls repr()
      console.warn(Reflect.ownKeys(pyodideResult)) // Lists all properties and methods
      //console.warn(pyodideResult.__doc__) // Shows the documentation string
      pyodideResult.destroy()
      pyodideResult = undefined
    }

    return {
      type: 'result',
      id: message.id,
      data: pyodideResult,
    }
  } catch (e) {
    return {
      type: 'error',
      id: message.id,
      message: `Command ${message.command} resulted in an error ${e.message}`,
    }
  }
}
