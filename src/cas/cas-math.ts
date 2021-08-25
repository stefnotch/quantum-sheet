import { Expression } from '@cortex-js/compute-engine'
import { getExpressionValue, handleExpressionValue } from './mathjson-utils'

// TODO: Ask mathlive creator about how to best do stuff like this
// TODO: Use stuff from here https://github.com/cortex-js/compute-engine/blob/main/src/common/utils.ts
// TODO: Move more utility stuff over here

/**
 * Getters are variables that are being *read*
 */
export function getGetterNames(expression: Expression) {
  const getters = new Set<string>()

  function extractGetters(expression: Expression) {
    handleExpressionValue(expression, {
      symbol: (v) => getters.add(v),
      function: (v) => v.args.forEach((u) => extractGetters(u)),
    })
  }

  handleExpressionValue(expression, {
    symbol: (v) => getters.add(v),
    function: (v) => {
      // TODO: Don't hardcode "Assign", "Equal", and "Evaluate"
      if (v.head === 'Assign') {
        // Only extract getters from the non-variable part
        extractGetters(v.args[1])
      } else if (v.head === 'Equal') {
        // Numerical evaluation
        extractGetters(v.args[0])
      } else if (v.head === 'Evaluate') {
        // Symbolical evaluation
        extractGetters(v.args[0])
      } else {
        extractGetters([v.head, ...v.args])
      }
    },
  })

  return getters
}

/**
 * TODO: Actually this does too much. Instead, we want to get all direct getters and then any symbols that the getter might be using
 * Gets all the variables that are being read, including their references, recursively
 */
export function getAllGetterNames(expression: Expression, gettersData: Map<string, Expression>) {
  // Recursively get all getters. If a getter references some other getter, we get its value.
  const getterNames = new Set<string>()
  const queue = [...getGetterNames(expression)]

  while (queue.length > 0) {
    const name = queue.pop()
    if (name === undefined) continue
    if (getterNames.has(name)) continue

    getterNames.add(name)
    const expressionData = gettersData.get(name)
    if (expressionData !== undefined) {
      queue.push(...getGetterNames(expressionData))
    }
  }

  return getterNames
}

export function useEncoder() {
  const textEncoder = new TextEncoder()
  const textDecoder = new TextDecoder()

  // Using 16 ASCII letters to encode utf-8. So, 2 chars per byte.
  const charOffset = 'A'.charCodeAt(0)
  function encodeName(name: string) {
    const data = textEncoder.encode(name)
    let output = ''
    for (let i = 0; i < data.length; i++) {
      const highBits = (data[i] >> 4) & 0x0f
      const lowBits = data[i] & 0x0f
      output += String.fromCharCode(highBits + charOffset) + String.fromCharCode(lowBits + charOffset)
    }

    return output
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

  return {
    encodeName,
    decodeName,
  }
}
