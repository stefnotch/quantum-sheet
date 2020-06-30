import { Vec2 } from "./vectors";

export interface QuantumElemement {
  readonly id: string;
  readonly type: string;
  position: Vec2;
  size: Vec2;
  resizeable: boolean;
}
