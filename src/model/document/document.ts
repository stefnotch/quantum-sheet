// Not recursive! The expression tree on the other hand will be recursive.

import { QuantumElemement } from "./element";
import { useVector2 } from "./vectors";
import { ref, Ref } from "vue";

export interface QuantumDocument {
  readonly elements: Ref<QuantumElemement[]>;
  addElement: (element: QuantumElemement) => void;
  removeElement: (element: QuantumElemement) => void;

  // TODO: Figure out how to *display* scopes sometime later
}

export function useDocument(): QuantumDocument {
  const elements = ref([] as QuantumElemement[]);
  const compareVector2 = useVector2().compare;

  function addElement(element: QuantumElemement) {
    elements.value.push(element);
    elements.value.sort((a, b) => compareVector2(a.position, b.position));
  }

  function removeElement(element: QuantumElemement) {
    const index = elements.value.indexOf(element);
    if (index && index >= 0) {
      elements.value.splice(index, 1);
    }
  }

  return {
    elements,
    addElement,
    removeElement,
  };
}
