import type {} from 'vite'
import type { CasCommand } from './cas'
import { getGetterNames } from './cas-math'
import { Expression, format } from '@cortex-js/compute-engine'

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

  const MathJsonToSympy = new Map<string, (expression: Expression[]) => string>([
    ['Add', () => 'sympy.Add'],
    [
      'Subtract',
      (v) => {
        // a - b == a + (-b)
        v[2] = ['Multiply', v[2], -1]
        return 'sympy.Add'
      },
    ],
    [
      'Negate',
      (v) => {
        // -a == a * -1
        v.push(-1)
        return 'sympy.Mul'
      },
    ],
    ['Multiply', () => 'sympy.Mul'],
    [
      'Divide',
      (v) => {
        // Special case for simple fractions
        // TODO: Replace with a proper "is mathjson number" check
        if (typeof v[1] === 'number' && typeof v[2] === 'number') {
          // TODO: Only do this if rational numbers are enabled
          return 'sympy.Rational'
        } else {
          // a / b == a * b^(-1)
          v[2] = ['Power', v[2], -1]
          return 'sympy.Mul'
        }
      },
    ],
    ['Power', () => 'sympy.Pow'],
    [
      'Sqrt',
      (v) => {
        v.push(['Divide', 1, 2])
        return 'sympy.Pow'
      },
    ],
    [
      'Root',
      (v) => {
        v[2] = ['Divide', 1, v[2]]
        return 'sympy.Pow'
      },
    ],
    ['EqualEqual', () => 'sympy.Eq'],
    ['Parentheses', () => ''],

    ['Abs', () => 'sympy.Abs'],

    ['Sin', () => 'sympy.sin'],
    ['Cos', () => 'sympy.cos'],
    ['Tan', () => 'sympy.tan'],

    ['Sec', () => 'sympy.sec'],
    ['Csc', () => 'sympy.csc'],
    ['Cot', () => 'sympy.cot'],

    ['Arcsin', () => 'sympy.asin'],
    ['Arccos', () => 'sympy.acos'],
    ['Arctan', () => 'sympy.atan'],
    ['Arctan2', () => 'sympy.atan2'],

    ['Asec', () => 'sympy.asec'],
    ['Acsc', () => 'sympy.acsc'],
    ['Acot', () => 'sympy.acot'],

    ['Sinh', () => 'sympy.sinh'],
    ['Cosh', () => 'sympy.cosh'],
    ['Tanh', () => 'sympy.tanh'],

    ['Sech', () => 'sympy.sech'],
    ['Csch', () => 'sympy.csch'],
    ['Coth', () => 'sympy.coth'],

    ['Arsinh', () => 'sympy.asinh'],
    ['Arcosh', () => 'sympy.acosh'],
    ['Artanh', () => 'sympy.atanh'],

    ['Asech', () => 'sympy.asech'],
    ['Acsch', () => 'sympy.acsch'],
    ['Acoth', () => 'sympy.acoth'],

    ['Pi', () => 'sympy.pi'],
    ['ImaginaryUnit', () => 'sympy.I'], // TODO: test
    ['ExponentialE', () => 'sympy.E'], // TODO: test
    ['GoldenRatio', () => 'sympy.GoldenRatio'], // TODO: test
    ['EulerGamma', () => 'sympy.EulerGamma'], // TODO: test

    // TODO: MathLive latex serial/parse destroys ln,log, etc? in ExpressionElement.vue line 78
    // ['log', () => 'sympy.log'],
  ])

  const KnownLatexFunctions = {
    '\\sin': 'sympy.sin',
    '\\cot': 'sympy.cot',
    '\\arcctg': 'sympy.acot',
  }

  // TODO: Options (rational numbers)
  function expressionToPython(expression: any): string {
    if (Array.isArray(expression)) {
      // Handle Functions (Add, Power, Sin, etc.)
      expression = expression.slice() // Make a copy so that we can safely modify the expression
      const functionName = expression[0]
      const functionInPython = MathJsonToSympy.get(functionName)
      let pythonFunctionName = functionInPython ? functionInPython(expression) : functionName

      const parameters = []
      for (let i = 1; i < expression.length; i++) {
        parameters.push(expressionToPython(expression[i]))
      }
      return `${pythonFunctionName}(${parameters.join(',')})`
    } else if (typeof expression === 'string') {
      const constantInPython = MathJsonToSympy.get(expression)
      // TODO: Handle Units here?
      if (constantInPython) {
        // Handle Constants (pi, e, etc.)
        return constantInPython([])
      } else {
        // Handle Variables
        return encodeName(expression)
      }
    } else if (typeof expression === 'number') {
      // Handle Numbers
      if (Number.isInteger(expression)) {
        return `sympy.Integer(${expression})`
      } else {
        return `sympy.Rational(${expression})`
      }
    } else if (expression === null) {
      return `None`
    } else if (expression.num !== undefined) {
      if (Number.isInteger(Number(expression.num))) {
        return `sympy.Integer(${expression.num})`
      } else {
        return `sympy.Rational(${expression.num})`
      }
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
          // Sympy doesn't accept all operations https://docs.sympy.org/latest/tutorial/manipulation.html
          'canonical-subtract',
        ])
      ),
    KnownLatexFunctions,
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
      },
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
  const { encodeName, decodeNames, expressionToPython, KnownLatexFunctions } = usePythonConverter()
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
    // For now, only parse the expression if there is an "Equal" or "Solve" or "Apply" at the root
    // TODO: Handle nested "Equal", "Solve", "Apply"s. For example, 3x=5 -> computed solution goes here = numerical solution goes here
    if (command.expression[0] == 'Equal') {
      // TODO: If the expression is only a single getter or something simple, don't call the CAS
      pythonExpression = `${expressionToPython(command.expression[1])}\n\t.subs({${substitutions}})\n\t.evalf()`
    } else if (command.expression[0] == 'Evaluate') {
      // https://docs.sympy.org/latest/tutorial/simplification.html
      let evaluation = (command.expression[2] + '').toLowerCase()
      const evaluationParameters = evaluation.match(/\\left\((.*?)\\right/)
      const evaluationArgument = evaluationParameters ? evaluationParameters[1] : ''

      if (evaluation.includes('solve')) {
        let variablesToSolveFor: string[] = []
        if (evaluation == 'solve') {
          // Automatically Find Variables
          getterNames.forEach((getterName) => {
            if (!command.gettersData.has(getterName)) {
              variablesToSolveFor.push(getterName)
            }
          })
        } else {
          // TODO: only 1 variable?
          variablesToSolveFor.push(evaluationArgument)
        }

        if (variablesToSolveFor.length !== 1) {
          console.error('Expected one variable to solve for', variablesToSolveFor)
        }

        const innerExpression = command.expression[1]
        if (Array.isArray(innerExpression) && innerExpression[0] == 'EqualEqual') {
          // TODO: Use recommended solver instead of the generic one
          pythonExpression = `sympy.solvers.solve(\n\t${expressionToPython(innerExpression)}\n\t\t.subs({${substitutions}})\n,${encodeName(
            variablesToSolveFor[0]
          )})`
        } else {
          console.error('Expected inner expression to be EqualEqual (==)')
        }
      } else if (evaluation == 'simplify') {
        pythonExpression = `sympy.simplify(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
      } else if (evaluation == '\\expand') {
        pythonExpression = `sympy.expand(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
      } else if (evaluation == 'factor') {
        pythonExpression = `sympy.factor(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
        // } else if (evaluation == 'cancel') {
        //   pythonExpression = `sympy.cancel(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
        // } else if (evaluation == 'apart') {
        //   pythonExpression = `sympy.apart(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
        // } else if (evaluation == 'trig_simp') {
        //   pythonExpression = `sympy.trigsimp(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
        // } else if (evaluation == '\\expandtrig') {
        //   pythonExpression = `sympy.expand_trig(\n\t${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n)`
      } else if (evaluation.includes('rewrite')) {
        // ex: rewrite(\\sin)
        let using = ''
        if (evaluationArgument && evaluationArgument in KnownLatexFunctions) {
          using = KnownLatexFunctions[evaluationArgument]
        } else {
          // else: slap a 'sympy.' in front of it and attempt!?
          if (evaluationArgument) {
            using = evaluationArgument.replace('\\', '')
          }
        }

        pythonExpression = `${expressionToPython(command.expression[1])}\n\t\t.subs({${substitutions}})\n\t\t.rewrite(${using})`
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
      command: pythonExpression,
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
    cancelCommand,
  }
}
