import { ref, Ref } from 'vue'
import { Vector2 } from '../vectors'
import type { ScopeElement } from './elements/scope-element'
import { v4 as uuidv4 } from 'uuid'

type JsonType = null | boolean | number | string | JsonType[] | { [prop: string]: JsonType }

export type QuantumElementType<
  T extends typeof QuantumElement & { new (options: QuantumElementCreationOptions): QuantumElement } = typeof QuantumElement & {
    new (options: QuantumElementCreationOptions): QuantumElement
  },
  U extends string = string
> = {
  readonly typeName: U
  elementType: T // new (...args: any[]) => QuantumElement // &
  serializeElement(element: T): JsonType
  deserializeElement(data: JsonType): T
}
/*
type QuantumElementTypeSmol<T extends typeof QuantumElement & { new (options: QuantumElementCreationOptions): QuantumElement }, U extends string> = {
  readonly typeName: string
  readonly elementType: T
  deserializeElement(data: JsonType): T
}

function doc<T extends readonly QuantumElementTypeSmol<typeof QuantumElement & { new (options: QuantumElementCreationOptions): QuantumElement }, string>[]>(value: T): {
  [key in T[number]["typeName"]]: T[number]
} {
  return null as any
}

let result1 = doc([{
  typeName: "cat",
  elementType: null as any as typeof ScopeElement,
  deserializeElement: (data) => null as any as typeof ScopeElement
},{
  typeName: "cat",
  elementType: null as any as typeof ScopeElement,
  deserializeElement: (data) => null as any as typeof ScopeElement
}] as const)
let dog: keyof typeof result1 = "" as any
let paw = new result1[dog].elementType({})

type QuantumDoc<Keys extends string> = {
  [key in Keys]: QuantumElementTypeSmol<typeof QuantumElement & { new (options: QuantumElementCreationOptions): QuantumElement }, key>
}

function n<T extends QuantumDoc<Keys>, Keys extends string>(value: T): T {
  return null as any
}

let x = n({
  cat: {
    deserializeElement: (data) => null as any as typeof ScopeElement,
    typeName: 'dog',
    elementType: null as any as typeof ScopeElement,
  },
})

let testNames = ['cat', 'dog', 'cow'] as const

function objectifyTestNames<T extends readonly string[]>(n: T): { [k in T[number]]: k } {
  return null as any
}

let result = objectifyTestNames(testNames)
*/

/**
 * Please be careful to not put elements into anything reactive
 */
export abstract class QuantumElement {
  readonly id: string = uuidv4()
  abstract typeName: string

  readonly position: Ref<Vector2> = ref(Vector2.zero)
  // can include a fractional part
  readonly size: Ref<Vector2> = ref(new Vector2(5, 2)) // TODO: Size stuff
  readonly resizeable: Ref<boolean> = ref(false)
  readonly selected: Ref<boolean> = ref(false)
  readonly focused: Ref<boolean> = ref(false)
  readonly scope: Ref<ScopeElement | undefined> = ref<ScopeElement>()

  constructor(options: QuantumElementCreationOptions) {
    if (options.position) {
      this.position.value = options.position
    }
    if (options.resizeable) {
      this.resizeable.value = options.resizeable
    }
    /* When moving a block, we know its target index. Therefore we know what neighbors the block has after insertion. (And the "scope start/getters" and "scope end/setters" nicely guarantee that the neighbor stuff will always be correct. ((If we do not have getters in the tree, in case of a getter, we could increment the index until we find a setter but then the whole blocks stuff becomes relevant and honestly, that's not fun anymore)))
^ Therefore, we can totally keep track of which scope every block is in. It's super cheap. (Block --> scope)
*/
    /*
variableManager: shallowReadonly(
        scopeVariables.getVariableManager(computed(() => block.position))
      ),*/
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
  resizeable?: boolean
}
