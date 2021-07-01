import { Ref } from "vue";
import { Vector2 } from "../vectors";
import type { UseScopeElement } from "./elements/scope-element";

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
