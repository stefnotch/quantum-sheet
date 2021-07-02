// Not recursive! The expression tree on the other hand will be recursive.

import { UseQuantumElement, QuantumElementCreationOptions, QuantumElementType } from './document-element'
import { Vector2 } from '../vectors'
import { readonly, shallowReactive, shallowRef, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import arrayUtils from '../array-utils'
import { UseScopeElement, ScopeElementType } from './elements/scope-element'

export type QuantumDocumentElementTypes = QuantumElementType<UseQuantumElement, string>['documentType'] & typeof ScopeElementType.documentType

// type NameToElementType<T extends {useElement: (...args: any) => UseQuantumElement}> = T extends {useElement: (...args: any) => infer R} ? R : any;

/**
 * A top level document, containing a list of elements.
 */
export interface UseQuantumDocument<TElements extends QuantumDocumentElementTypes> {
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
  readonly elements: ReadonlyArray<UseQuantumElement>

  /**
   * Creates an element with a given type
   * @param typeName Element type name
   * @param options Element options
   */
  createElement<T extends keyof TElements>(typeName: T, options: QuantumElementCreationOptions): ReturnType<TElements[T]['useElement']>

  /**
   * Deletes an element
   * @param element Element
   */
  deleteElement(element: UseQuantumElement): void

  /**
   * Gets the element at a given position
   * @param position Position
   */
  getElementAt(position: Vector2): UseQuantumElement | undefined

  /**
   * Gets the element with the given id
   * @param id Element id
   * @param type Element type name
   */
  getElementById<T extends keyof TElements>(id: string, typeName: T): ReturnType<TElements[T]['useElement']> | undefined

  /**
   * Set the element selection
   * @param elements Elements to select
   */
  setSelection(...elements: UseQuantumElement[]): void

  /**
   * Sets the element focus
   */
  setFocus(element?: UseQuantumElement): void
}

function useElementList() {
  const elements = shallowReactive<UseQuantumElement[]>([])

  function watchElement(element: UseQuantumElement) {
    const stopHandle = watch(
      element.position,
      (value, oldValue) => {
        let { index } = arrayUtils.getBinaryInsertIndex(elements, (a) => a.position.value.compareTo(value))

        // TODO: A block added callback
        // TODO: Refactor the scope setting
        const prev = arrayUtils.tryGetElement(elements, index - 1)
        if (prev?.typeName == ScopeElementType.typeName) {
          element.setScope(prev as UseScopeElement)
        } else {
          element.setScope(prev?.scope.value)
        }

        elements.splice(index, 0, element)
      },
      {
        immediate: true
      }
    )

    return () => {
      stopHandle()
      element.setScope(undefined) // TODO: Refactor the scope setting
      const index = elements.indexOf(element)
      if (index >= 0) {
        elements.splice(index, 1)
      }
    }
  }

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
    getElementAt
  }
}

function useElementSelection() {
  const selectedElements = shallowReactive<Set<UseQuantumElement>>(new Set())

  function watchElement(element: UseQuantumElement) {
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
        immediate: true
      }
    )

    return () => {
      element.selected.value = false
      stopHandle()
    }
  }

  function setSelection(...elements: UseQuantumElement[]) {
    selectedElements.forEach((e) => e.setSelected(false))
    elements.forEach((e) => e.setSelected(true))
  }

  return {
    selectedElements,
    setSelection,
    watchElement
  }
}

function useElementFocus() {
  const focusedElement = shallowRef<UseQuantumElement>()

  function watchElement(element: UseQuantumElement) {
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
        immediate: true
      }
    )

    return () => {
      element.focused.value = false
      stopHandle()
    }
  }

  function setFocus(element?: UseQuantumElement) {
    if (element) {
      element.setFocused(true)
    } else {
      focusedElement.value?.setFocused(false)
    }
  }

  return {
    focusedElement,
    watchElement,
    setFocus
  }
}

function useQuantumElement(
  typeName: string,
  options: QuantumElementCreationOptions
  /* Here internal document stuff can be passed */
): UseQuantumElement {
  const position = ref(options.position ?? Vector2.zero)
  const size = ref(new Vector2(5, 2)) // TODO: Size stuff
  const resizeable = ref(options.resizeable ?? false)
  const selected = ref(false)
  const focused = ref(false)
  const scope = ref<UseScopeElement>()

  function setPosition(value: Vector2) {
    position.value = value
  }
  function setSize(value: Vector2) {
    size.value = value
  }
  function setSelected(value: boolean) {
    selected.value = value
  }
  function setFocused(value: boolean) {
    focused.value = value
  }
  function setScope(value: UseScopeElement | undefined) {
    scope.value = value
  }

  return {
    id: uuidv4(),
    typeName: typeName,
    position,
    size,
    resizeable,
    selected,
    focused,
    scope,
    setPosition,
    setSize,
    setSelected,
    setFocused,
    setScope
  }
}

/**
 * Create a document
 * @param elementTypes Element types in the document
 */
export function useDocument<TElements extends QuantumDocumentElementTypes>(elementTypes: TElements): UseQuantumDocument<TElements> {
  const gridCellSize = readonly(new Vector2(20, 20))

  const elementRemoveCallbacks = new Map<string, () => void>()
  const elementList = useElementList()
  const elementSelection = useElementSelection()
  const elementFocus = useElementFocus()

  const rootScope = createElement(ScopeElementType.typeName, {
    position: Vector2.zero
  }) // TODO: Scope size:

  function createElement<T extends keyof TElements>(typeName: T, options: QuantumElementCreationOptions): ReturnType<TElements[T]['useElement']> {
    let elementType = elementTypes[typeName]
    if (!elementType) throw new Error(`Unknown element type ${typeName}`)

    const element = elementType.useElement(useQuantumElement('' + typeName, options)) as ReturnType<TElements[T]['useElement']>

    let stopHandles = [elementList.watchElement(element), elementSelection.watchElement(element), elementFocus.watchElement(element)]
    elementRemoveCallbacks.set(element.id, () => {
      stopHandles.forEach((stopHandle) => stopHandle())
    })

    /* When moving a block, we know its target index. Therefore we know what neighbors the block has after insertion. (And the "scope start/getters" and "scope end/setters" nicely guarantee that the neighbor stuff will always be correct. ((If we do not have getters in the tree, in case of a getter, we could increment the index until we find a setter but then the whole blocks stuff becomes relevant and honestly, that's not fun anymore)))
^ Therefore, we can totally keep track of which scope every block is in. It's super cheap. (Block --> scope)
*/
    /*
variableManager: shallowReadonly(
        scopeVariables.getVariableManager(computed(() => block.position))
      ),*/

    // Weird, Typescript doesn't like whatever I cooked up
    return element
  }

  function deleteElement(element: UseQuantumElement) {
    let removeCallback = elementRemoveCallbacks.get(element.id)
    if (removeCallback) {
      removeCallback()
      elementRemoveCallbacks.delete(element.id)
    }
  }

  function getElementById<T extends keyof TElements>(id: string, typeName?: T): ReturnType<TElements[T]['useElement']> | undefined {
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
    setFocus: elementFocus.setFocus
  }
}
