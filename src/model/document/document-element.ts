import { ref, Ref } from "vue";
import { Vector2 } from "../vectors";
import type { UseScopeElement } from "./elements/scope-element";
import { v4 as uuidv4 } from "uuid";

type JsonType =
  | null
  | boolean
  | number
  | string
  | JsonType[]
  | { [prop: string]: JsonType };

export type QuantumElementType1<
  T extends UseQuantumElement,
  U extends string
> = {
  readonly typeName: U;
  documentType: {
    [K in U]: {
      readonly typeName: K;
      elementType: typeof QuantumElement;
      serializeElement(element: T): JsonType;
      deserializeElement(data: JsonType): T;
    };
  };
};

export abstract class QuantumElement {
  readonly id: string = uuidv4();
  abstract typeName: string;

  readonly position: Ref<Vector2> = ref(Vector2.zero);
  // can include a fractional part
  readonly size: Ref<Vector2> = ref(new Vector2(5, 2)); // TODO: Size stuff
  readonly resizeable: Ref<boolean> = ref(false);
  readonly selected: Ref<boolean> = ref(false);
  readonly focused: Ref<boolean> = ref(false);
  readonly scope: Ref<UseScopeElement | undefined> = ref<UseScopeElement>();

  constructor(options: QuantumElementCreationOptions) {
    if (options.position) {
      this.position.value = options.position;
    }
    if (options.resizeable) {
      this.resizeable.value = options.resizeable;
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
    this.position.value = value;
  }

  setSize(value: Vector2) {
    this.size.value = value;
  }

  setSelected(value: boolean) {
    this.selected.value = value;
  }

  setFocused(value: boolean) {
    this.focused.value = value;
  }

  setScope(value: UseScopeElement | undefined) {
    this.scope.value = value;
  }
}

/**
 * An element in the document.
 * Specialized elements will extend this interface and add their own properties.
 */
export interface UseQuantumElement {
  readonly id: string;
  readonly typeName: string;

  position: Ref<Vector2>;
  size: Ref<Vector2>; // can include a fractional part
  resizeable: Ref<boolean>;
  selected: Ref<boolean>;
  focused: Ref<boolean>;
  scope: Ref<UseScopeElement | undefined>;

  setPosition(value: Vector2): void;
  setSize(value: Vector2): void;
  setSelected(value: boolean): void;
  setFocused(value: boolean): void;
  setScope(value: UseScopeElement | undefined): void;
}

/**
 * Parameters to pass when creating an element
 */
export interface QuantumElementCreationOptions {
  position?: Vector2;
  resizeable?: boolean;
}

// This type is used to say "an element with the following name exists"
// It's pretty complicated, maybe it could be simplified
export type QuantumElementType<
  T extends UseQuantumElement,
  U extends string
> = {
  readonly typeName: U;
  documentType: {
    [K in U]: {
      readonly typeName: K;
      useElement: (block: UseQuantumElement) => T;
      serializeElement(element: T): string;
      deserializeElement(data: string): T;
    };
  };
};
