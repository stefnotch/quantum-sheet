import { markRaw, ref, Ref, shallowRef } from 'vue'
import { Vector2 } from '../vectors'
import type { ScopeElement } from './elements/scope-element'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'

type JsonType = null | boolean | number | string | JsonType[] | { [prop: string]: JsonType }

export type QuantumElementType<
  T extends QuantumElement = QuantumElement,
  TCtor extends QuantumElementConstructor<T> = QuantumElementConstructor<T>,
  U extends string = string
> = {
  readonly typeName: U
  elementType: TCtor
  serializeElement(element: T): JsonType
  deserializeElement(data: any): { element: T; onAddedCallback: () => void }
}

export interface QuantumElementConstructor<T> {
  new (options: QuantumElementCreationOptions): T
}

/**
 * Please be careful to not put elements into anything reactive
 */
export abstract class QuantumElement {
  readonly id: string = uuidv4()
  abstract typeName: string

  readonly position: Ref<Vector2> = ref(Vector2.zero)
  // can include a fractional part
  readonly size: Ref<Vector2> = ref(new Vector2(5, 2)) // TODO: Size stuff
  readonly resizable: Ref<boolean> = ref(false)
  readonly selected: Ref<boolean> = ref(false)
  readonly focused: Ref<boolean> = ref(false)
  readonly scope: Ref<ScopeElement | undefined> = shallowRef<ScopeElement>()

  constructor(options: QuantumElementCreationOptions) {
    markRaw(this) // Prevents this from accidentally becoming reactive and stops the variables from being unwrapped
    if (options.position) this.position.value = options.position
    if (options.resizable) this.resizable.value = options.resizable
    if (options.size) this.size.value = options.size
    if (options.scope) this.scope.value = options.scope
    if (options.id && uuidValidate(options.id)) this.id = options.id
  }

  setPosition(value: Vector2) {
    this.position.value = value
  }

  setSize(value: Vector2) {
    this.size.value = value
  }

  setSelected(value: boolean) {
    this.selected.value = value
  }

  setFocused(value: boolean) {
    this.focused.value = value
  }

  setScope(value: ScopeElement | undefined) {
    this.scope.value = value
  }
}

/**
 * Parameters to pass when creating an element
 */
export interface QuantumElementCreationOptions {
  position?: Vector2
  resizable?: boolean
  size?: Vector2
  scope?: ScopeElement | undefined
  id?: string
}
