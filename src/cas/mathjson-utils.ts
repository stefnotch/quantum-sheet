import { Expression } from '@cortex-js/compute-engine'

export type ExpressionValue<T extends number = number> =
  | {
      type: 'number'
      value: number | bigint | string
    }
  | {
      type: 'symbol'
      value: string
    }
  | {
      type: 'string'
      value: string
    }
  | {
      type: 'function'
      value: {
        /** The function name or an expression in the case of function composition, like [["InverseFunction", "Sin"], "x"] */
        head: string | Expression<T>[]
        args: Expression<T>[]
      }
    }
  | {
      type: 'dictionary'
      value: {
        [key: string]: Expression<T>
      }
    }

export function handleExpressionValue<T extends number = number>(
  expr: Expression<T>,
  handler: {
    number?: (value: number | bigint | string) => void
    symbol?: (value: string) => void
    string?: (value: string) => void
    function?: (value: { head: string | Expression<T>[]; args: Expression<T>[] }) => void
    dictionary?: (value: { [key: string]: Expression<T> }) => void
  }
) {
  const value = getExpressionValue(expr)
  handler[value.type]?.(value.value as any)
}

export function getExpressionValue<T extends number = number>(expr: Expression<T>): ExpressionValue<T> {
  // See https://cortexjs.io/math-json/
  switch (typeof expr) {
    case 'bigint': {
      return {
        type: 'number',
        value: expr,
      }
    }
    case 'boolean': {
      throw new Error('Expression cannot contain booleans')
    }
    case 'function': {
      throw new Error('Expression cannot contain Javascript functions')
    }
    case 'number': {
      return {
        type: 'number',
        value: expr,
      }
    }
    case 'object': {
      if (Array.isArray(expr)) {
        if (expr.length >= 1) {
          return {
            type: 'function',
            value: {
              head: expr[0] as any,
              args: expr.slice(1),
            },
          }
        } else {
          throw new Error('Expression contained an illegal function value ' + expr)
        }
      } else {
        const exprObj = expr as { [key: string]: any }
        if (exprObj.num) {
          if (typeof exprObj.num === 'string') {
            // Remove the endings
            if (exprObj.num.endsWith('n') || exprObj.num.endsWith('d')) {
              return {
                type: 'number',
                value: exprObj.num.slice(0, exprObj.num.length - 1),
              }
            }
          }
          return {
            type: 'number',
            value: exprObj.num,
          }
        } else if (exprObj.sym) {
          return {
            type: 'symbol',
            value: exprObj.sym,
          }
        } else if (exprObj.str) {
          return {
            type: 'string',
            value: exprObj.str,
          }
        } else if (exprObj.fn) {
          if (Array.isArray(exprObj.fn) && exprObj.fn.length >= 1) {
            return {
              type: 'function',
              value: {
                head: exprObj.fn[0],
                args: exprObj.fn.slice(1),
              },
            }
          } else {
            throw new Error('Expression contained an illegal function value ' + expr)
          }
        } else if (exprObj.dict) {
          return {
            type: 'dictionary',
            value: exprObj.dict,
          }
        } else {
          throw new Error('Expression contained an illegal value ' + expr)
        }
      }
      break
    }
    case 'string': {
      // It's probably a symbol
      // However, there are 3 number cases
      if (expr === 'NaN') {
        return {
          type: 'number',
          value: NaN,
        }
      }
      if (expr === '+Infinity') {
        return {
          type: 'number',
          value: Infinity,
        }
      }
      if (expr === '-Infinity') {
        return {
          type: 'number',
          value: -Infinity,
        }
      }
      // And one 'string' case
      if (expr.length >= 2 && expr[0] === "'" && expr[expr.length - 1] === "'") {
        return {
          type: 'string',
          // TODO: I'm not sure if this handles escaped stuff in strings entirely correctly
          value: expr.slice(1, expr.length - 1),
        }
      }
      return {
        type: 'symbol',
        value: expr,
      }
    }
    case 'symbol': {
      throw new Error('Expression cannot contain Symbol() ' + expr)
    }
    case 'undefined': {
      throw new Error('Expression was undefined')
    }
    default: {
      throw new Error('Expression contained an illegal value ' + expr)
    }
  }
}
