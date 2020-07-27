import { Ref } from "vue";
import { Vec2 } from "../vectors";
import { QuantumScope } from "./reactive-scopes";

export interface UseQuantumElementType<T extends UseQuantumElement> {
  type: string;
  useElement: (block: UseQuantumElement) => T;
  serializeElement(element: T): string;
  deserializeElement(data: string): T;
  component: any;
}

export interface UseQuantumElement {
  id: string;
  type: string;

  position: Ref<Vec2>;
  size: Ref<Vec2>; // can include a fractional part
  resizeable: Ref<boolean>;
  selected: Ref<boolean>;
  focused: Ref<boolean>;
  scope: Ref<QuantumScope | undefined>;

  setPosition(value: Vec2): void;
  setSize(value: Vec2): void;
  setSelected(value: boolean): void;
  setFocused(value: boolean): void;
  setScope(value: QuantumScope | undefined): void;
}

export interface QuantumElementCreationOptions {
  position?: Vec2;
  resizeable?: boolean;
}
