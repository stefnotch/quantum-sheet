import { ref } from "vue";

/**
 * Every element (or cell) should support a few features for QuantumSheet to work nicely.
 * For example, `moveToStart` can be called when the user navigates into the element using the arrow keys
 */
export interface ElementCommands {
  elementType: string;
  moveToStart?: () => void;
  moveToEnd?: () => void;
  insert?: (text: string) => void;
}

export function useFocusedElementCommands() {
  const commands = ref<ElementCommands>();

  return {
    commands,
  };
}
