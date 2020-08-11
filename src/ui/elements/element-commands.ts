import { ref } from "vue";

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
