// Not recursive! The expression tree on the other hand will be recursive.

import { QuantumElemement, QuantumElementFunctions } from "./document-element";
import { useVector2, Vec2 } from "./vectors";
import { ref, Ref, reactive, readonly, shallowRef } from "vue";
import { v4 as uuidv4 } from "uuid";

export interface QuantumDocument {
  readonly elementTypes: Readonly<QuantumElementTypes>;

  readonly blocks: Ref<QuantumBlock<QuantumElemement>[]>;
  createBlock(
    type: string,
    options: QuantumBlockCreationOptions
  ): QuantumBlock<QuantumElemement>;
  deleteBlock(block: QuantumBlock<QuantumElemement>): void;

  // TODO: Figure out how to *display* scopes sometime later
}

export type QuantumElementTypes = {
  [name: string]: {
    component: any;
    functions: QuantumElementFunctions;
  };
};

export interface QuantumBlock<T extends QuantumElemement> {
  readonly id: string;
  readonly type: string;
  readonly position: Readonly<Vec2>;
  readonly size: Readonly<Vec2>;
  readonly resizeable: boolean;

  setPosition: (value: Vec2) => void;
  setSize: (value: Vec2) => void;

  element: T;
}

type QuantumBlockCreationOptions = {
  position?: Vec2;
  resizeable?: boolean;
  serializedElement?: string;
};

/**
 * Create a document
 * @param elementTypes Element types in the document
 */
export function useDocument(
  elementTypes: QuantumElementTypes
): QuantumDocument {
  const blocks = shallowRef<QuantumBlock<QuantumElemement>[]>([]);
  const compareVector2 = useVector2().compare;

  /**
   * Creates a block with a given element type
   * @param type Element type
   * @param options Element options
   */
  function createBlock(type: string, options: QuantumBlockCreationOptions) {
    let elementType = elementTypes[type];
    if (!elementType) throw new Error(`Unknown element type ${type}`);

    // TODO: Implement serialization
    if (options.serializedElement) {
      throw new Error(`Serialization not implemented yet`);
      // element = elementType.functions.deserializeElement(options.serializedElement);
    }

    let element = elementType.functions.createElement();

    // TODO: A block added callback
    let block: QuantumBlock<QuantumElemement> = reactive({
      id: uuidv4(),
      type: type,
      position: options.position ?? { x: 0, y: 0 },
      size: { x: 10, y: 10 },
      resizeable: options.resizeable ?? true,
      setPosition: () => {}, // TODO:
      setSize: function (value: Vec2) {
        this.size = value;
      },
      element: element,
    });

    // TODO: Some position changed callback or so
    blocks.value.push(block);
    blocks.value.sort((a, b) => compareVector2(a.position, b.position));

    return block;
  }

  /**
   * Deletes a block
   * @param type
   */
  function deleteBlock(block: QuantumBlock<QuantumElemement>) {
    // TODO: A deleted callback. The element should be notified, so that it can do its thingy
    const index = blocks.value.indexOf(block);
    if (index && index >= 0) {
      blocks.value.splice(index, 1);
    }
  }

  // TODO: Callbacks for
  // - Added
  // - Removed
  // - Sorted/Moved (ideally in reverse order)
  // well, not actually callbacks, the functions can stay entirely local. They're just needed to update the expression tree/scope variables

  return {
    blocks,
    createBlock,
    deleteBlock,
    elementTypes: readonly(elementTypes),
  };
}
