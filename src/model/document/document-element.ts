import { Ref } from "vue";
import { Vector2 } from "../vectors";
import type { UseScopeElement } from "./elements/scope-element";

export type QuantumElementType<
  T extends UseQuantumElement,
  U extends string
> = {
  typeName: U;
  documentType: {
    [K in U]: {
      typeName: K;
      useElement: (block: UseQuantumElement) => T;
      serializeElement(element: T): string;
      deserializeElement(data: string): T;
    };
  };
};

export interface UseQuantumElement {
  id: string;
  typeName: string;

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

export interface QuantumElementCreationOptions {
  position?: Vector2;
  resizeable?: boolean;
}
