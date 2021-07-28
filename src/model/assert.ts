export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg)
  }
}
export function assertUnreachable(_x: never): never {
  throw new Error('This case should have never been reached')
}
