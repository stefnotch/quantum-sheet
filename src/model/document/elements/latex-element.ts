import { QuantumElementType, QuantumElement, QuantumElementCreationOptions } from '../document-element'
import { ref } from 'vue'
import { Vector2 } from '../../vectors'

export const ElementType = 'latex-element'

export class LatexElement extends QuantumElement {
  typeName: typeof ElementType = ElementType

  readonly latex = ref<string>('')

  constructor(options: QuantumElementCreationOptions) {
    super(options)
  }
}

export const LatexElementType: QuantumElementType<LatexElement, typeof LatexElement, typeof ElementType> = {
  typeName: ElementType,
  elementType: LatexElement,
  serializeElement: (element: LatexElement) => {
    const serializedElement = {
      id: element.id,
      typeName: ElementType,
      position: { x: element.position.value.x, y: element.position.value.y },
      size: { x: element.size.value.x, y: element.size.value.y },
      resizable: element.resizable.value,
      // latex element properties
      latex: element.latex.value,
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
    const element = new LatexElement(creationOptions)
    return {
      element: element,
      onAddedCallback: () => {
        element.latex.value = elementData.latex
      },
    }
  },
}
