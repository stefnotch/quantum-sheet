import type {} from 'vite'
import type { CasCommand } from './cas'
import { getGetterNames } from './cas-math'
import { format } from '@cortex-js/compute-engine'

export type WorkerMessage =
  | {
      type: 'python'
      id: string
      data: {
        [key: string]: any
      }
      command: any
    }
  | {
      type: 'expression'
      id: string
      symbols: string[]
      command: any
    }

export type WorkerResponse =
  | {
      type: 'initialized'
    }
  | {
      type: 'result'
      id: string
      data: any
    }
  | {
      type: 'error'
      id: string
      message: string
    }

// TODO: Split out the python converter and contribute it to mathlive/cortex-js?
function usePythonConverter() {
  const textEncoder = new TextEncoder()
  const textDecoder = new TextDecoder()

  // TODO: Only convert names that actually need to be converted? Or use some standard encoding format?
  // Using 16 characters to encode utf-8. So, 2 chars per byte.
  const charOffset = 'A'.charCodeAt(0)
  function encodeName(name: string) {
    const data = textEncoder.encode(name)
    let output = ''
    for (let i = 0; i < data.length; i++) {
      const highBits = (data[i] >> 4) & 0x0f
      const lowBits = data[i] & 0x0f
      output += String.fromCharCode(highBits + charOffset) + String.fromCharCode(lowBits + charOffset)
    }

    return '_' + output
  }

  function decodeName(name: string) {
    name = name.slice(1)
    const output = new Uint8Array(name.length / 2)
    for (let i = 0; i < name.length; i += 2) {
      const highBits = name.charCodeAt(i) - charOffset
      const lowBits = name.charCodeAt(i + 1) - charOffset
      output[i / 2] = (highBits << 4) | lowBits
    }
    return textDecoder.decode(output)
  }

  function decodeNames(expression: any) {
    if (Array.isArray(expression)) {
      const functionName = expression[0]
      const output = expression.slice()
      for (let i = 1; i < expression.length; i++) {
        output[i] = decodeNames(expression[i])
      }
      return output
    } else if (typeof expression === 'string') {
      return decodeName(expression)
    } else {
      return expression
    }
  }

  // TODO: Options (rational numbers)
  function expressionToPython(expression: any): string {
    if (Array.isArray(expression)) {
      const functionName = expression[0]
      let pythonFunctionName = ''
      const parameters = []

      if (functionName == 'Add') {
        pythonFunctionName = 'sympy.Add'
      } else if (functionName == 'Subtract') {
        pythonFunctionName = 'Subtract' // TODO: Negate the second parameter
      } else if (functionName == 'Negate') {
        pythonFunctionName = 'sympy.Mul'
        parameters.push(-1)
      } else if (functionName == 'Multiply') {
        pythonFunctionName = 'sympy.Mul'
      } else if (functionName == 'Divide') {
        pythonFunctionName = 'Divide' // TODO: Raise the second parameter to the power of -1
      } else if (functionName == 'Power') {
        pythonFunctionName = 'sympy.Pow'
      } else if (functionName == 'Sqrt') {
        pythonFunctionName = 'Sqrt' // TODO: Replace with power
      } else if (functionName == 'EqualEqual') {
        pythonFunctionName = 'sympy.Eq'
      } else {
        pythonFunctionName = functionName
      }
      for (let i = 1; i < expression.length; i++) {
        parameters.push(expressionToPython(expression[i]))
      }
      return `${pythonFunctionName}(${parameters.join(',')})`
    } else if (typeof expression === 'string') {
      return encodeName(expression)
    } else if (typeof expression === 'number') {
      return `sympy.Float(${expression})`
    } else if (expression === null) {
      return `None`
    } else if (expression.num !== undefined) {
      return `sympy.Float(${expression.num})`
    } else {
      // TODO: Make sure to handle all cases (string, number, bool, array, object, ...)
      console.warn('Unknown element type', { x: expression })
      return ''
    }
  }

  return {
    encodeName,
    decodeName,
    decodeNames,
    expressionToPython: (expression: any) =>
      expressionToPython(
        format(expression, [
          // TODO: This has changed: https://cortexjs.io/compute-engine/guides/forms/
          // Sympy doesn't accept all operations https://docs.sympy.org/latest/tutorial/manipulation.html
          'canonical-root',
          'canonical-subtract',
          'canonical-divide' // This one probably needs to be changed. The others seem fine
        ])
      )
  }
}

/**
 * Interface for a pyodide web worker or shared worker
 */
interface PyodideWorker {
  onmessage: ((ev: MessageEvent) => any) | null
  onmessageerror: ((ev: MessageEvent) => any) | null
  onerror: ((ev: ErrorEvent) => any) | null

  postMessage(message: any, transfer: Transferable[]): void
  postMessage(message: any, options?: PostMessageOptions): void
}

/**
 * Creates a pyodide web worker, unless one already exists.
 * In a development environment, it'll create a shared worker instead.
 * @returns
 */
function getOrCreateWorker(): Promise<PyodideWorker> {
  const workerUrl = `${import.meta.env.BASE_URL}pyodide-worker.js`

  if (import.meta.env.DEV && SharedWorker) {
    // Shared worker, survives all reloading as long as a tab is referencing it
    console.log(
      `Creating pyodide worker... Slow? Try our new ${new URL(import.meta.env.BASE_URL + 'pyodide-worker-keep-alive.html', document.baseURI).href}`
    )
    const sharedWorker = new SharedWorker(workerUrl)
    const pyodideWorker: PyodideWorker = {
      onmessage: null,
      onmessageerror: null,
      onerror: null,
      postMessage: function (message: any, options?: PostMessageOptions | Transferable[]) {
        sharedWorker.port.postMessage(message, options as any)
      }
    }

    return new Promise((resolve, reject) => {
      sharedWorker.port.onmessage = (e) => {
        sharedWorker.port.onmessage = function (e: MessageEvent) {
          pyodideWorker.onmessage?.apply(this, [e])
        }
        sharedWorker.port.onmessageerror = function (e: MessageEvent) {
          pyodideWorker.onmessage?.apply(this, [e])
        }
        sharedWorker.onerror = function (e: ErrorEvent) {
          pyodideWorker.onerror?.apply(this, [e])
        }
        const workerResponse = e.data
        if (workerResponse.type == 'initialized') {
          resolve(pyodideWorker)
        } else {
          reject(`Did not receive response of type initialized. ${e.data}`)
        }
      }
      sharedWorker.port.onmessageerror = (e) => {
        reject(`Message error ${e}`)
      }
      sharedWorker.onerror = (e) => {
        reject(e.message)
      }
      sharedWorker.port.start()
    })
  } else {
    // Normal web worker, survives vite hot reloading
    let worker: Worker = (window as any)['pyodide-worker']
    if (worker) {
      return Promise.resolve(worker)
    } else {
      console.log('Creating pyodide worker...')
      worker = new Worker(workerUrl)
      ;(window as any)['pyodide-worker'] = worker

      return new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          worker.onmessage = null
          worker.onmessageerror = null
          worker.onerror = null

          const workerResponse = e.data
          if (workerResponse.type == 'initialized') {
            resolve(worker)
          } else {
            reject(`Did not receive response of type initialized. ${e.data}`)
          }
        }
        worker.onmessageerror = (e) => {
          reject(`Message error ${e}`)
        }
        worker.onerror = (e) => {
          reject(e.message)
        }
      })
    }
  }
}

export function usePyodide() {
  let worker: PyodideWorker | undefined
  const commandBuffer: WorkerMessage[] = []
  const { encodeName, decodeNames, expressionToPython } = usePythonConverter()
  const commands = new Map<string, CasCommand>()

  getOrCreateWorker().then(
    (result) => {
      console.log('Done creating worker!')
      worker = result

      worker.onmessage = (e) => {
        let response = e.data as WorkerResponse
        console.log('Response', response)

        if (response.type == 'result') {
          const command = commands.get(response.id)
          command?.callback(decodeNames(JSON.parse(response.data)))
          commands.delete(response.id)
        } else if (response.type == 'error') {
          console.warn(response)
          commands.delete(response.id)
        } else {
          console.error('Unknown response type', response)
        }
      }
      worker.onerror = (e) => {
        console.warn('Worker error', e)
      }
      worker.onmessageerror = (e) => {
        console.error('Message error', e)
      }

      commandBuffer.forEach((v) => sendCommand(v))
      commandBuffer.length = 0
    },
    (error) => {
      throw new Error(error)
    }
  )

  function executeCommand(command: CasCommand) {
    commands.set(command.id, command)

    const getterNames = getGetterNames(command.expression)
    const symbolNames = Array.from(getterNames).map((key) => encodeName(key))

    const substitutions = Array.from(command.gettersData.entries())
      .map(([key, value]) => `${encodeName(key)}:${expressionToPython(value)}`)
      .join(',')

    let pythonExpression = ''
    // Only parse the expression if there is an "Equal" or "Solve" or "Apply" at the root
    if (command.expression[0] == 'Equal') {
      // TODO: If the expression is only a single getter or something simple, don't call the CAS
      pythonExpression = `${expressionToPython(command.expression[1])}\n\t.subs({${substitutions}})\n\t.evalf()`
    } else if (command.expression[0] == 'Evaluate') {
      if ((command.expression[2] + '').toLowerCase() == 'solve') {
        let variablesToSolveFor: string[] = []
        getterNames.forEach((getterName) => {
          if (!command.gettersData.has(getterName)) {
            variablesToSolveFor.push(getterName)
          }
        })
        if (variablesToSolveFor.length !== 1) {
          console.error('Expected one variable to solve for', variablesToSolveFor)
        }

        const innerExpression = command.expression[1]
        if (Array.isArray(innerExpression) && innerExpression[0] == 'EqualEqual') {
          // TODO: Use recommended solver instead of the generic one

          pythonExpression = `sympy.solvers.solve(\n\t${expressionToPython(innerExpression)}\n\t\t.subs({${substitutions}})\n)`
        } else {
          console.error('Expected inner expression to be EqualEqual (==)')
        }
      } else {
        pythonExpression = `${expressionToPython(command.expression[1])}\n\t.subs({${substitutions}})\n\t.evalf()`
      }
    } else {
      commands.delete(command.id)
      return
    }

    console.log('Python expression', pythonExpression)
    sendCommand({
      type: 'expression',
      id: command.id,
      data: {},
      symbols: symbolNames,
      command: pythonExpression
    } as WorkerMessage)
  }

  function cancelCommand(command: CasCommand) {
    if (commands.delete(command.id)) {
      // TODO: Interrupt worker
    }
  }

  function sendCommand(command: WorkerMessage) {
    if (!worker) {
      commandBuffer.push(command)
    } else {
      worker.postMessage(command)
    }
  }

  return {
    executeCommand,
    cancelCommand
  }
}
