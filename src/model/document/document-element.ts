import { Vec2 } from "./vectors";
import { Ref, readonly, reactive, markRaw } from "vue";

import type { QuantumDocument } from "./document";

export interface QuantumElemement {}

export type QuantumElementFunctions<
  T extends QuantumElemement = QuantumElemement
> = {
  createElement: () => T;
  serializeElement: (element: T) => string;
  deserializeElement: (data: string) => T;
};
