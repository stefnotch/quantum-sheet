import type { Expression } from '@cortex-js/compute-engine'
import { v4 as uuidv4 } from 'uuid'
import { usePyodide } from './pyodide-cas'

export interface UseCas {
  doneLoading: Promise<void>
  executeCommand(command: CasCommand): void
  cancelCommand(command: CasCommand): void
}

// TODO: Top level commands
// "Evaluate", "Equals", "Apply"
/**
 *
 *
 * Equal: Numerical evaluation
 *
 * Evaluate: Symbolical evaluation
 *
 * TODO: Apply: | apply *3 | apply +2 and things like that
 */
export type CasExpression = ['Equal' | 'Evaluate', ...Expression[]]

/**
 * A command has one expression. It is expected that all expressions/commands are submitted and executed in order.
 *
 * The expression can have some direct getters (e.g. 3x+5+1 has `x` as a getter)
 * Those getters can have a value with some *undefined* symbols. For example `x = 3`, `x = 7cm` and `x = undefined` are all valid values.
 * Notably, a getter with another getter is not okay. We do not recursively evaluate getters, instead it's expected that it has already been evaluated.
 */
export class CasCommand {
  readonly id: string
  readonly gettersData: Map<string, any>
  readonly expression: CasExpression

  readonly callback: (result: any) => void

  constructor(gettersData: Map<string, any>, expression: CasExpression, callback: (result: any) => void) {
    this.id = uuidv4()
    this.gettersData = gettersData
    this.expression = expression
    this.callback = callback
  }
}

export function useCas(): UseCas {
  const cas = usePyodide()

  /*function evaluateExpression(expression: any, gettersData: ReadonlyMap<string, any>, options?: {
    signal?: AbortController
  }): Promise<CasResponse> {
    // And the CasResponse can: Stream some results + progress, return a single result, etc.
  }*/

  function executeCommand(command: CasCommand) {
    console.log('Executing', command)
    cas.executeCommand(command)
  }

  function cancelCommand(command: CasCommand) {
    cas.cancelCommand(command)
  }

  return {
    doneLoading: cas.doneLoading,
    executeCommand,
    cancelCommand,
  }
}
