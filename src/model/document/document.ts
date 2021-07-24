// Not recursive! The expression tree on the other hand will be recursive.

import { QuantumElementCreationOptions, QuantumElementType, QuantumElement } from './document-element'
import { Vector2 } from '../vectors'
import { readonly, shallowReactive, shallowRef, ref, watch } from 'vue'
import arrayUtils from '../array-utils'
import { ScopeElement, ScopeElementType } from './elements/scope-element'
import { ExpressionElement, ExpressionElementType } from './elements/expression-element'

type JsonType = null | boolean | number | string | JsonType[] | { [prop: string]: JsonType }

export type QuantumDocumentElementTypes<T extends readonly QuantumElementType[] = readonly QuantumElementType[]> = {
  [key in T[number]['typeName']]: T[number]
} & { ['scope-element']: typeof ScopeElementType } & { ['expression-element']: typeof ExpressionElementType }

type QReturnType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : any

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
  getElementById<T extends keyof TElements>(id: string, typeName: T): QReturnType<TElements[T]['elementType']> | undefined

  /**
   * Gets the element with the given id
   * @param type Element type name
   */
  // getElementsByType<T extends keyof TElements>(id: string, typeName: T): QReturnType<TElements[T]['elementType']>[] | undefined

  /**
   * Set the element selection
   * @param elements Elements to select
   */
  setSelection(...elements: QuantumElement[]): void

  /**
   * Sets the element focus
   */
  setFocus(element?: QuantumElement): void

  serializeDocument(): JsonType
  deserializeDocument(): void
}

function useElementList() {
  const elements = shallowReactive<QuantumElement[]>([])

  function watchElement(element: QuantumElement) {
    const stopHandle = watch(
      element.position,
      (value, oldValue) => {
        let { index } = arrayUtils.getBinaryInsertIndex(elements, (a) => a.position.value.compareTo(value))

        // TODO: A block added callback
        // TODO: Refactor the scope setting
        const prev = arrayUtils.tryGetElement(elements, index - 1)
        if (prev?.typeName == ScopeElementType.typeName) {
          element.setScope(prev as ScopeElement)
        } else {
          element.setScope(prev?.scope.value)
        }

        elements.splice(index, 0, element)
      },
      {
        immediate: true,
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

    /* When moving a block, we know its target index. Therefore we know what neighbors the block has after insertion. (And the "scope start/getters" and "scope end/setters" nicely guarantee that the neighbor stuff will always be correct. ((If we do not have getters in the tree, in case of a getter, we could increment the index until we find a setter but then the whole blocks stuff becomes relevant and honestly, that's not fun anymore)))
^ Therefore, we can totally keep track of which scope every block is in. It's super cheap. (Block --> scope)
*/
    /*
variableManager: shallowReadonly(
        scopeVariables.getVariableManager(computed(() => block.position))
      ),*/

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

  function getElementsByType<T extends keyof TElements>(typeName: T): QReturnType<TElements[T]['elementType']>[] | undefined {
    let elements = elementList.elements.filter((e) => e.typeName == typeName)

    // Yeah, Typescript really does dislike this XD
    return elements as any[]
  }

  function serializeDocument() {
    var serializedData: JsonType[] = []
    // console.log('Serializing document', elementList.elements)
    const ExpressionElements = getElementsByType(ExpressionElementType.typeName)
    // console.log('ExpressionElements:', ExpressionElements)
    // ExpressionElementType.serializeElement(ExpressionElements[0])
    ExpressionElements?.forEach((element: ExpressionElement) => {
      serializedData.push(serializedData.push(ExpressionElementType.serializeElement(element)))
    })
    // ScopeElement
    // Other Elements
    return serializedData
  }

  function deserializeDocument(serializedData: JsonType) {
    console.log('DeSerializing file')

    // const s = elementList.elements[1].serializeElement()
    // console.log(s)
    // ExpressionElementType.serializeElement(elementList.elements[1])
    return null
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

    serializeDocument,
    deserializeDocument,
  }
}
