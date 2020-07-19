// Not recursive! The expression tree on the other hand will be recursive.

import {
  UseQuantumElementType,
  UseQuantumElement,
  QuantumElementCreationOptions,
} from "./document-element";
import {
  clone as cloneVector2,
  compare as compareVector2,
  Vec2,
} from "../vectors";
import { readonly, shallowReactive, shallowRef, ref, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import { getBinaryInsertIndex } from "../utils";

// TODO: Make stuff readonly
// TODO: Variables and scopes are a property of the document itself!
export type QuantumDocumentElementTypes = {
  [key: string]: UseQuantumElementType<UseQuantumElement>;
};

export interface UseQuantumDocument<
  TElements extends QuantumDocumentElementTypes
> {
  readonly gridCellSize: Readonly<Vec2>;
  readonly elementTypes: Readonly<TElements>;

  /**
   * Gets the component associated with an element type
   * @param type Element type
   */
  getTypeComponent<T extends keyof TElements>(type: T): any;

  /**
   * Shallow reactive elements array
   */
  readonly elements: ReadonlyArray<UseQuantumElement>;

  /**
   * Creates an element with a given type
   * @param type Element type
   * @param options Element options
   */
  createElement<T extends keyof TElements>(
    type: T,
    options: QuantumElementCreationOptions
  ): ReturnType<TElements[T]["useElement"]>;

  /**
   * Deletes an element
   * @param element Element
   */
  deleteElement(element: UseQuantumElement): void;

  /**
   * Gets the element at a given position
   * @param position Position
   */
  getElementAt(position: Vec2): UseQuantumElement | undefined;

  /**
   * Gets the element with the given id
   * @param id Element id
   * @param type Element type
   */
  getElementById<T extends keyof TElements>(
    id: string,
    type: T
  ): ReturnType<TElements[T]["useElement"]> | undefined;

  /**
   * Set the element selection
   * @param elements Elements to select
   */
  setSelection(...elements: UseQuantumElement[]): void;

  /**
   * Sets the element focus
   */
  setFocus(element?: UseQuantumElement): void;
}

function useElementList() {
  const elements = shallowReactive<UseQuantumElement[]>([]);

  function watchElement(element: UseQuantumElement) {
    const stopHandle = watch(
      element.position,
      (value, oldValue) => {
        let insertPosition = getBinaryInsertIndex(elements, (a) =>
          compareVector2(a.position.value, value)
        );

        // TODO: A block added callback

        elements.splice(
          insertPosition < 0 ? -(insertPosition + 1) : insertPosition,
          0,
          element
        );
      },
      {
        immediate: true,
      }
    );

    return () => {
      stopHandle();
      const index = elements.indexOf(element);
      if (index >= 0) {
        elements.splice(index, 1);
      }
    };
  }

  function getElementAt(position: Vec2) {
    const posX = position.x;
    const posY = position.y;
    for (let i = elements.length - 1; i >= 0; i--) {
      let element = elements[i];
      let x = element.position.value.x;
      let y = element.position.value.y;
      if (
        y <= posY &&
        posY <= y + element.size.value.y &&
        x <= posX &&
        posX <= x + element.size.value.x
      ) {
        return element;
      }
    }

    return undefined;
  }

  return {
    elements,
    watchElement,
    getElementAt,
  };
}

function useElementSelection() {
  const selectedElements = shallowReactive<Set<UseQuantumElement>>(new Set());

  function watchElement(element: UseQuantumElement) {
    const stopHandle = watch(
      element.selected,
      (value) => {
        if (value) {
          selectedElements.add(element);
        } else {
          selectedElements.delete(element);
        }
      },
      {
        immediate: true,
      }
    );

    return () => {
      element.selected.value = false;
      stopHandle();
    };
  }

  function setSelection(...elements: UseQuantumElement[]) {
    selectedElements.forEach((e) => e.setSelected(false));
    elements.forEach((e) => e.setSelected(true));
  }

  return {
    selectedElements,
    setSelection,
    watchElement,
  };
}

function useElementFocus() {
  const focusedElement = shallowRef<UseQuantumElement>();

  function watchElement(element: UseQuantumElement) {
    const stopHandle = watch(
      element.focused,
      (value) => {
        if (value) {
          if (focusedElement.value?.focused) {
            focusedElement.value.setFocused(false);
          }
          focusedElement.value = element;
        } else {
          if (focusedElement.value == element) {
            focusedElement.value = undefined;
          }
        }
      },
      {
        immediate: true,
      }
    );

    return () => {
      element.focused.value = false;
      stopHandle();
    };
  }

  function setFocus(element?: UseQuantumElement) {
    if (element) {
      element.setFocused(true);
    } else {
      focusedElement.value?.setFocused(false);
    }
  }

  return {
    focusedElement,
    watchElement,
    setFocus,
  };
}

function useQuantumElement(
  type: string,
  options: QuantumElementCreationOptions
  /* Here internal document stuff can be passed */
): UseQuantumElement {
  const position = ref(cloneVector2(options.position ?? { x: 0, y: 0 }));
  const size = ref({ x: 20, y: 20 }); // TODO: Size stuff
  const resizeable = ref(options.resizeable ?? false);
  const selected = ref(false);
  const focused = ref(false);

  function setPosition(value: Vec2) {
    position.value = cloneVector2(value);
  }
  function setSize(value: Vec2) {
    size.value = cloneVector2(value);
  }
  function setSelected(value: boolean) {
    selected.value = value;
  }
  function setFocused(value: boolean) {
    focused.value = value;
  }

  return {
    id: uuidv4(),
    type: type,
    position,
    size,
    resizeable,
    selected,
    focused,
    setPosition,
    setSize,
    setSelected,
    setFocused,
  };
}

/**
 * Create a document
 * @param elementTypes Element types in the document
 */
export function useDocument<TElements extends QuantumDocumentElementTypes>(
  elementTypes: TElements
): UseQuantumDocument<TElements> {
  const gridCellSize = readonly({ x: 20, y: 20 });

  const elementRemoveCallbacks = new Map<string, () => void>();
  const elementList = useElementList();
  const elementSelection = useElementSelection();
  const elementFocus = useElementFocus();

  function getTypeComponent<T extends keyof TElements>(type: T) {
    return elementTypes[type].component;
  }

  function createElement<T extends keyof TElements>(
    type: T,
    options: QuantumElementCreationOptions
  ): ReturnType<TElements[T]["useElement"]> {
    let elementType = elementTypes[type];
    if (!elementType) throw new Error(`Unknown element type ${type}`);

    const element = elementType.useElement(
      useQuantumElement("" + type, options)
    );

    let stopHandles = [
      elementList.watchElement(element),
      elementSelection.watchElement(element),
      elementFocus.watchElement(element),
    ];
    elementRemoveCallbacks.set(element.id, () => {
      stopHandles.forEach((stopHandle) => stopHandle());
    });

    /* When moving a block, we know its target index. Therefore we know what neighbors the block has after insertion. (And the "scope start/getters" and "scope end/setters" nicely guarantee that the neighbor stuff will always be correct. ((If we do not have getters in the tree, in case of a getter, we could increment the index until we find a setter but then the whole blocks stuff becomes relevant and honestly, that's not fun anymore)))
^ Therefore, we can totally keep track of which scope every block is in. It's super cheap. (Block --> scope)
*/
    /*
variableManager: shallowReadonly(
        scopeVariables.getVariableManager(computed(() => block.position))
      ),*/

    // Weird, Typescript doesn't like whatever I cooked up
    return element as any;
  }

  function deleteElement(element: UseQuantumElement) {
    let removeCallback = elementRemoveCallbacks.get(element.id);
    if (removeCallback) {
      removeCallback();
      elementRemoveCallbacks.delete(element.id);
    }
  }

  function getElementById<T extends keyof TElements>(
    id: string,
    type?: T
  ): ReturnType<TElements[T]["useElement"]> | undefined {
    let element = elementList.elements.find((e) => e.id == id);
    if (element && type && element.type != type) {
      throw new Error(
        `Wrong type, passed ${type} but element has ${element.type}`
      );
    }

    // Yeah, Typescript really does dislike this XD
    return element as any;
  }

  // TODO: Callbacks with (block or element, index: number, oldIndex?: number) for
  // - Added
  // - Removed
  // - Moved (and which elements are inbetween prev and new position)
  // And a special optimization for moving:
  // - When moving elements, iterate over them in reverse order (yep, that heuristic works for every case)
  // - If their siblings are the same, don't do anything
  // - else, remove and add the element from the syntax tree
  // well, not actually callbacks, the functions can stay entirely local. They're just needed to update the expression tree/scope variables

  return {
    gridCellSize,
    elementTypes: elementTypes,
    getTypeComponent,
    elements: elementList.elements,
    createElement,
    deleteElement,
    getElementAt: elementList.getElementAt,
    getElementById,
    setSelection: elementSelection.setSelection,
    setFocus: elementFocus.setFocus,
  };
}

// Delete:
{
  // Restructuring ideas so that modifying a deeply nested property stops being a pain in the butt
  // - Flatten everything? (e.g. and then call useBlock(document, elementId))
  // - shallowRef(useSomething())
  // - No more readonly
  // - Not exposing the actual model but rather a copy of it to the outside world
  // - Lots of watchEffect() (e.g. when adding a block to the document, the document watchEffects the block's .focused)
  // The issue here is that I'm using this "readonly" stuff as an internal type as well...
  // (e.g. passing it to internal functions)
  /* interface QuantumBlock<T extends QuantumElemement> {
    readonly variableManager: VariableManager; // variables (does not deal with expression computing!)

    // variables, cas, block, element, scope, expression computing
    // Not sure where I should store stuff like the variable references...
    // (BTW, elements have to be updated, regardless of their block being visible or their component existing)
  }

  interface QuantumScope {
    readonly startPosition: Readonly<Vec2>;
    readonly endPosition: Readonly<Vec2>;
    readonly childScopes: ReadonlyArray<QuantumScope>;
    readonly variables: ReadonlyArray<ScopedVariable>; // Make sure to keep this sorted
  }

  interface ScopedVariable {
    readonly position: Readonly<Vec2>;
    readonly value: Readonly<any>;
    readonly getters: ReadonlyArray<ScopedVariableGetter>;
  }

  type ScopedVariableGetter = (newValue: Readonly<any>) => void;*/
}
