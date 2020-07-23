import { DeepReadonly } from "vue";

declare const StoreStateSymbol: unique symbol;

export type ReadonlyState<T> = DeepReadonly<T> & { [StoreStateSymbol]?: true };

/**
 * Exposes a readonly version of the state
 * @param state State to expose
 */
export function exposeState<T>(state: T): ReadonlyState<T> {
  return state as ReadonlyState<T>;
}

/**
 * Gets the internal, read-write version of the state
 * @param readonlyState Exposed state
 */
export function getState<T>(readonlyState: ReadonlyState<T>): T {
  return readonlyState as T;
}
