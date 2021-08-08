// Not recursive! The expression tree on the other hand will be recursive.

import { QuantumElementCreationOptions, QuantumElementType, QuantumElement } from './document-element'
import { Vector2 } from '../vectors'
import { readonly, shallowReactive, shallowRef, ref, watch } from 'vue'
import arrayUtils from '../array-utils'
import { ScopeElement, ScopeElementType } from './elements/scope-element'

export type QuantumDocumentElementTypes<T extends readonly QuantumElementType[] = readonly QuantumElementType[]> = {
  [key in T[number]['typeName']]: T[number]
} & { ['scope-element']: typeof ScopeElementType }

type QReturnType<T extends new (...args: any) => any> = T extends new (...args: any) => infer R ? R : any

/**
 * A top level document, containing a list of elements.
 */
export interface UseQuantumDocument<TElements extends QuantumDocumentElementTypes<readonly QuantumElementType[]>> {
  /**
   * How large the grid cells are, in pixels
   */
  readonly gridCellSize: Readonly<Vector2>

  /**
   * Which elements the document contains
   */
  readonly elementTypes: Readonly<TElements>

  /**
   * Shallow reactive elements array
   */
  readonly elements: ReadonlyArray<QuantumElement>

  /**
   * Creates an element with a given type
   * @param typeName Element type name
   * @param options Element options
   */
  createElement<T extends keyof TElements>(typeName: T, options: QuantumElementCreationOptions): QReturnType<TElements[T]['elementType']>

  /**
   * Deletes an element
   * @param element Element
   */
  deleteElement(element: QuantumElement): void

  /**
   * Gets the element at a given position
   * @param position Position
   */
  getElementAt(position: Vector2): QuantumElement | undefined

  /**
   * Gets the element with the given id
   * @param id Element id
   * @param type Element type name
   */
  getElementById<T extends keyof TElements>(id: string, typeName?: T): QReturnType<TElements[T]['elementType']> | undefined

  /**
   * Set the element selection
   * @param elements Elements to select
   */
  setSelection(...elements: QuantumElement[]): void

  /**
   * Sets the element focus
   */
  setFocus(element?: QuantumElement): void
}

/**
 * Keeps track of the element positions in an ordered list. Also takes care of setting the element-scopes.
 *
 * There is no "element-inserted" callback, instead elements can wait until their scope stops being `undefined`
 */
function useElementList() {
  const elements = shallowReactive<QuantumElement[]>([])

  /** Watches an element's position. Returns a function to stop the watcher. */
  function watchElement(element: QuantumElement) {
    const stopWatcher = watch(
      element.position,
      (value, oldValue) => {
        // New index
        let { index } = arrayUtils.getBinaryInsertIndex(elements, (a) => a.position.value.compareTo(value))

        // Element is still in the same position
        if (arrayUtils.get(elements, index) === element) {
          return
        }

        const prev = arrayUtils.get(elements, index - 1)
        if (prev?.typeName == ScopeElementType.typeName) {
          element.setScope(prev as ScopeElement)
        } else {
          element.setScope(prev?.scope.value)
        }

        // Move by remove-adding the element
        arrayUtils.remove(elements, element)
        elements.splice(index, 0, element)
      },
      {
        immediate: true,
      }
    )

    return () => {
      stopWatcher()
      element.setScope(undefined)
      arrayUtils.remove(elements, element)
    }
  }

  /** Gets an element at a given position, useful for when the user clicks somewhere in the document. */
  function getElementAt(position: Vector2) {
    const posX = position.x
    const posY = position.y
    for (let i = elements.length - 1; i >= 0; i--) {
      let element = elements[i]
      let x = element.position.value.x
      let y = element.position.value.y
      if (y <= posY && posY <= y + element.size.value.y && x <= posX && posX <= x + element.size.value.x) {
        return element
      }
    }

    return undefined
  }

  return {
    elements,
    watchElement,
    getElementAt,
  }
}

function useElementSelection() {
  const selectedElements = shallowReactive<Set<QuantumElement>>(new Set())

  function watchElement(element: QuantumElement) {
    const stopHandle = watch(
      element.selected,
      (value) => {
        if (value) {
          selectedElements.add(element)
        } else {
          selectedElements.delete(element)
        }
      },
      {
        immediate: true,
      }
    )

    return () => {
      element.selected.value = false
      stopHandle()
    }
  }

  function setSelection(...elements: QuantumElement[]) {
    selectedElements.forEach((e) => e.setSelected(false))
    elements.forEach((e) => e.setSelected(true))
  }

  return {
    selectedElements,
    setSelection,
    watchElement,
  }
}

function useElementFocus() {
  const focusedElement = shallowRef<QuantumElement>()

  function watchElement(element: QuantumElement) {
    const stopHandle = watch(
      element.focused,
      (value) => {
        if (value) {
          if (focusedElement.value?.focused) {
            focusedElement.value.setFocused(false)
          }
          focusedElement.value = element
        } else {
          if (focusedElement.value == element) {
            focusedElement.value = undefined
          }
        }
      },
      {
        immediate: true,
      }
    )

    return () => {
      element.focused.value = false
      stopHandle()
    }
  }

  function setFocus(element?: QuantumElement) {
    if (element) {
      element.setFocused(true)
    } else {
      focusedElement.value?.setFocused(false)
    }
  }

  return {
    focusedElement,
    watchElement,
    setFocus,
  }
}

/**
 * Create a document
 * @param elementTypes Element types in the document
 */
export function useDocument<TElements extends QuantumDocumentElementTypes<readonly QuantumElementType[]>>(
  elementTypes: TElements
): UseQuantumDocument<TElements> {
  const gridCellSize = readonly(new Vector2(20, 20))

  const elementRemoveCallbacks = new Map<string, () => void>()
  const elementList = useElementList()
  const elementSelection = useElementSelection()
  const elementFocus = useElementFocus()

  const rootScope = createElement(ScopeElementType.typeName, {
    position: Vector2.zero,
  }) // TODO: Scope size:

  function createElement<T extends keyof TElements>(typeName: T, options: QuantumElementCreationOptions): QReturnType<TElements[T]['elementType']> {
    let elementType = elementTypes[typeName]
    if (!elementType) throw new Error(`Unknown element type ${typeName}`)

    const element = new elementType.elementType(options)
    //elementType.useElement(useQuantumElement('' + typeName, options)) as ReturnType<TElements[T]['useElement']>

    let stopHandles = [elementList.watchElement(element), elementSelection.watchElement(element), elementFocus.watchElement(element)]
    elementRemoveCallbacks.set(element.id, () => {
      stopHandles.forEach((stopHandle) => stopHandle())
    })

    // Weird, Typescript doesn't like whatever I cooked up
    return element as any
  }

  function deleteElement(element: QuantumElement) {
    let removeCallback = elementRemoveCallbacks.get(element.id)
    if (removeCallback) {
      removeCallback()
      elementRemoveCallbacks.delete(element.id)
    }
  }

  function getElementById<T extends keyof TElements>(id: string, typeName?: T): QReturnType<TElements[T]['elementType']> | undefined {
    let element = elementList.elements.find((e) => e.id == id)
    if (element && typeName && element.typeName != typeName) {
      throw new Error(`Wrong type, passed ${typeName} but element has ${element.typeName}`)
    }

    // Yeah, Typescript really does dislike this XD
    return element as any
  }

  return {
    gridCellSize,
    elementTypes: elementTypes,
    elements: elementList.elements,
    createElement,
    deleteElement,
    getElementAt: elementList.getElementAt,
    getElementById,
    setSelection: elementSelection.setSelection,
    setFocus: elementFocus.setFocus,
  }
}
