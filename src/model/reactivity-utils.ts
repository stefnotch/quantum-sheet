import { Ref, watch } from 'vue'

export const watchImmediate: typeof watch = function (source: any, callback: any, options?: any) {
  if (!options) {
    options = {}
  }
  options.immediate = true
  return watch(source, callback, options)
}

export function untilDefined<T>(source: Ref<T>): Promise<T> {
  return new Promise((resolve) => {
    const stopHandle = watch(source, (value) => {
      if (value !== undefined && value !== null) {
        stopHandle()
        resolve(value)
      }
    })
  })
}
