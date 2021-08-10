import { QuantumElement, QuantumElementCreationOptions, QuantumElementType } from '../document-element'
import { ref, Ref, reactive, shallowRef, watch, watchEffect, computed, ComputedRef, toRaw } from 'vue'
import { Vector2 } from '../../vectors'
import arrayUtils from '../../array-utils'
import { assert } from '../../assert'
import { watchImmediate } from '../../reactivity-utils'

export const ElementType = 'scope-element'

export class ScopeElement extends QuantumElement {
  typeName: typeof ElementType = ElementType

  /**
   * Name of the scope, used for named imports
   */
  readonly name: Ref<string> = ref('')

  /**
   * A closed scope does not auto-import variables from its parent scope
   */
  readonly closed: Ref<boolean> = ref(false)

  private readonly _variableMap = reactive(new Map<string, ScopedVariable[]>())

  /**
   * Variables defined in this scope
   * 0th variable is always the import-variable
   */
  public get variableMap(): ReadonlyMap<string, ScopedVariable[]> {
    return this._variableMap
  }

  constructor(options: QuantumElementCreationOptions) {
    super(options)
  }

  // Note: I'll try to not use childScopes for now. I think I can get away without them.

  setName(value: string): void {
    this.name.value = value
  }

  /*const imports = computed(() => {
    variables.forEach((value, key) => {
      if(value[0].getters.length > 0) {
        .push()
      }
    });
  })*/

  private createVariableArray(name: string): ScopedVariable[] {
    // First variable, used to import values from the scope above
    const importerVariable: ScopedVariable = reactive({
      position: computed(() => this.position.value),
      index: 0,
      data: shallowRef(),
      getters: [],
    })

    const newVariableArray = reactive([importerVariable])
    // Cleanup if unused
    watch([() => newVariableArray.length, () => importerVariable.getters.length], ([variableArrayLength, gettersLength]) => {
      if (variableArrayLength <= 1 && gettersLength == 0) {
        this._variableMap.delete(name)
      }
    })

    this._variableMap.set(name, newVariableArray)
    return newVariableArray
  }

  addVariable(name: string, position: ComputedRef<Vector2>): UseScopedVariable {
    // Add variable
    const variable: ScopedVariable = reactive({
      position: position,
      index: -1,
      data: shallowRef<any>(null),
      getters: [],
    })

    const variableArray = this.variableMap.get(name) ?? this.createVariableArray(name)

    watchImmediate(
      () => variable.position,
      (value) => {
        // Remove (or bail out)
        if (variable.index >= 0) {
          assert(variableArray[variable.index] == variable, `Expected variable ${variable} to be in ${variableArray} at index ${variable.index}`)

          const prev = arrayUtils.at(variableArray, variable.index - 1)
          const next = arrayUtils.at(variableArray, variable.index + 1)

          if (isInRange(value, { start: prev?.position, end: next?.position })) {
            // TODO: Optimize?
            // Currently this doesn't account for moving a variable past its getters
            // return
          }

          removeVariable(variableArray, variable)
        }

        // Add
        const { index } = arrayUtils.getBinaryInsertIndex(variableArray, (v) => v.position.compareTo(value))

        const prev = arrayUtils.at(variableArray, index - 1)
        // Take some getters from prev
        if (prev?.getters) {
          variable.getters = prev.getters.filter((v) => value.compareTo(v.position) <= 0)
          variable.getters.forEach((v) => {
            v.variable = variable
          })
          prev.getters = prev.getters.filter((v) => v.position.compareTo(value) < 0)
        }
        // Update variable indices
        for (let i = index; i < variableArray.length; i++) {
          variableArray[i].index = i + 1
        }
        variableArray.splice(index, 0, variable)
        variable.index = index
      }
    )

    function setData(data: any) {
      variable.data = data
    }

    function remove() {
      removeVariable(variableArray, variable)
    }

    return {
      setData,
      remove,
    }
  }

  addGetter(name: string, position: ComputedRef<Vector2>): UseScopedGetter {
    const getter: ScopedGetter = reactive({
      position: position,
      variable: undefined,
    })
    const data = computed(() => getter.variable?.data)

    const variableArray = this.variableMap.get(name) ?? this.createVariableArray(name)

    watchImmediate(
      () => getter.position,
      (value) => {
        if (getter.variable) {
          // If the getter is still in the correct position, bail out
          const nextVariable = arrayUtils.at(variableArray, getter.variable.index + 1)
          if (
            isInRange(value, {
              start: getter.variable.position,
              end: nextVariable?.position,
            })
          ) {
            return
          }

          // Remove getter from old variable
          arrayUtils.remove(getter.variable.getters, getter)
          getter.variable = undefined
        }

        const { index } = arrayUtils.getBinaryInsertIndex(variableArray, (v) => v.position.compareTo(value))

        const variable = arrayUtils.at(variableArray, index - 1)
        assert(variable, `Getter position ${getter.position} outside of block ${this.position}`)

        // Add getter to variable
        variable.getters.push(getter)
        getter.variable = variable
      }
    )

    function remove() {
      if (!getter.variable) return
      arrayUtils.remove(getter.variable.getters, getter)
      getter.variable = undefined
    }

    return {
      data,
      remove,
    }
  }
}

export const ScopeElementType: QuantumElementType<ScopeElement, typeof ScopeElement, typeof ElementType> = {
  typeName: ElementType,
  elementType: ScopeElement,
  serializeElement: (element: ScopeElement) => {
    const serializedElement = {
      id: element.id,
      typeName: ElementType,
      name: element.name.value,
      position: { x: element.position.value.x, y: element.position.value.y },
      size: { x: element.size.value.x, y: element.size.value.y },
      resizable: element.resizable.value,
      closed: element.closed.value,
      // scope: JSON.stringify(element.scope.value),
    }
    return serializedElement
  },
  deserializeElement: (elementData) => {
    const creationOptions = {
      id: elementData.id,
      position: new Vector2(elementData.position.x, elementData.position.y),
      size: new Vector2(elementData.size.x, elementData.size.y),
      resizable: elementData.resizable,
    }
    const element = new ScopeElement(creationOptions)
    return {
      element: element,
      onAddedCallback: () => {},
    }
  },
}

// TODO: Scope end element
// TODO: Child scopes

export interface UseScopedVariable {
  /**
   * - `undefined` is equivalent to the variable not existing
   * - `null` is a variable without data
   * - anything else is data
   */
  setData(data: any): void // TODO: Use MathJson type
  remove(): void
}

export interface UseScopedGetter {
  /**
   * - `undefined` is equivalent to the variable not existing
   * - `null` is a variable without data
   * - anything else is data
   */
  data: ComputedRef<any>
  remove(): void
}

// Internal interfaces
interface ScopedVariable {
  /**
   * Variable position
   */
  readonly position: Vector2

  /**
   * Variable index in array
   */
  index: number

  /**
   * Shallow ref variable data
   *
   */
  data: any

  /**
   * Variable getters
   */
  getters: ScopedGetter[]
}

interface ScopedGetter {
  /**
   * Getter position
   */
  readonly position: Vector2

  /**
   * Getter variable
   */
  variable: ScopedVariable | undefined
}

function removeVariable(variableArray: ScopedVariable[], variable: ScopedVariable) {
  if (variable.index < 0) return

  if (variable.getters.length > 0) {
    const prev = arrayUtils.at(variableArray, variable.index - 1)
    assert(prev, 'Expected prev variable to exist')

    prev.getters = prev.getters.concat(variable.getters)
    variable.getters.forEach((v) => (v.variable = prev))
    variable.getters = []
  }

  // Remove variable and update indices
  variableArray.splice(variable.index, 1)
  for (let i = variable.index; i < variableArray.length; i++) {
    variableArray[i].index = i
  }
  variable.index = -1
}

function isInRange(value: Vector2, range: { start?: Vector2; end?: Vector2 }) {
  return (!range.start || range.start.compareTo(value) <= 0) && (!range.end || value.compareTo(range.end) < 0)
}
