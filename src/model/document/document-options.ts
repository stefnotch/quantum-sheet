import { Vector2 } from '../vectors'
import { JsonType } from './document-element'

export interface DocumentOptions {
  /**
   * How large the grid cells are, in pixels
   */
  gridCellSize: Readonly<Vector2>

  /**
   * How the background should look
   */
  paperStyle: 'standard' | 'engineering'

  // The paper Size
  paperSize: any

  // TODO: Default Result Notation Style - Decimal (# Digits), Scientific, Fraction, other?
  // TODO: Result Text Style? - Text, LaTeX
  // TODO: Default Units
}

export function serializeOptions(options: DocumentOptions): JsonType {
  // TODO: Make this available for anything
  const serialized: JsonType = {}
  Object.entries(options).forEach(([key, value]) => {
    const jsonValue = serializeToJson(value, key)
    if (jsonValue !== undefined) {
      serialized[key] = jsonValue
    }
  })

  return serialized
}

function isPureObject(obj: any) {
  return typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj).isPrototypeOf(Object)
}

function serializeToJson(value: any, debugContext?: string): JsonType | undefined {
  switch (typeof value) {
    case 'bigint': {
      console.warn('Cannot serialize bigints', [debugContext, value])
      break
    }
    case 'boolean': {
      return value
    }
    case 'function': {
      console.warn('Cannot serialize functions', [debugContext, value])
      break
    }
    case 'number': {
      if (Number.isNaN(value)) {
        return {
          type: 'number',
          value: 'NaN',
        }
      } else if (value === Infinity) {
        return {
          type: 'number',
          value: 'Infinity',
        }
      } else if (value === -Infinity) {
        return {
          type: 'number',
          value: '-Infinity',
        }
      } else {
        return value
      }
    }
    case 'object': {
      if (value === null) {
        return null
      } else {
        if (Array.isArray(value)) {
          return value.map((v, i) => serializeToJson(v, `${value}[${i}]`) ?? null)
        } else if (isPureObject(value)) {
          const obj: JsonType = {}
          Object.entries(value).forEach(([key, value]) => {
            const jsonValue = serializeToJson(value, key)
            if (jsonValue !== undefined) {
              obj[key] = jsonValue
            }
          })
          return {
            type: 'object',
            value: obj,
          }
          // TODO: Refactor this a bit (e.g. pass custom serialization rules object in here)
        } else if (value instanceof Vector2) {
          return {
            type: 'class',
            className: 'Vector2',
            value: { x: value.x, y: value.y },
          }
        } else {
          console.warn('Cannot serialize object', [debugContext, value])
        }
      }
      break
    }
    case 'string': {
      return value
    }
    case 'symbol': {
      console.warn('Cannot serialize symbols', [debugContext, value])
      break
    }
    case 'undefined': {
      return {
        type: 'undefined',
      }
    }
  }
  return undefined
}

function deserializeFromJson(value: any): any {
  switch (typeof value) {
    case 'bigint':
    case 'boolean':
    case 'function':
    case 'number':
    case 'string':
    case 'symbol':
    case 'undefined': {
      return value
    }
    case 'object': {
      if (value === null) {
        return null
      } else {
        if (Array.isArray(value)) {
          return value.map((v) => deserializeFromJson(v))
        } else if (value.type === 'object') {
          const obj: any = {}
          Object.entries(value.value).forEach(([key, value]) => {
            obj[key] = deserializeFromJson(value)
          })
          return obj
        } else if (value.type === 'undefined') {
          return undefined
        } else if (value.type === 'number') {
          return +value.value // Convert to number
        } else if (value.type === 'class') {
          if (value.className === 'Vector2') {
            return new Vector2(value.value.x, value.value.y)
          }
        } else {
          console.warn('Invalid object ', value)
          return value
        }
      }
      break
    }
  }
  return undefined
}

export function deserializeOptions(serialized: JsonType): DocumentOptions {
  return deserializeFromJson(serialized) as DocumentOptions
}
