<template>
  <div
    class="quantum-document"
    ref="documentElement"
    tabindex="-1"
    :style="{
      '--grid-cell-size-x': `${document.gridCellSize.x}px`,
      '--grid-cell-size-y': `${document.gridCellSize.y}px`,
    }"
    @pointerdown="grid.pointerDown($event)"
    @paste="clipboard.paste"
    @focus="documentInputElement.focus()"
  >
    <textarea
      class="input-element"
      ref="documentInputElement"
      autofocus
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @input="grid.textInput($event)"
      @keydown="grid.keydown($event)"
      @keyup="grid.keyup($event)"
      @focus="
        document.setSelection();
        grid.showCrosshair.value = true;
      "
      @blur="grid.showCrosshair.value = false"
    ></textarea>
    <div
      class="grid-crosshair"
      :style="grid.gridToStyle(grid.crosshairPosition.value)"
      v-show="grid.showCrosshair.value"
    >
      +
    </div>
    <div
      class="quantum-block"
      v-for="element in document.elements"
      :key="element.id"
      :style="grid.gridToStyle(element.position.value)"
      :class="{ selected: element.selected.value }"
      @pointerdown="() => {}"
    >
      <component
        :is="getTypeComponent(element.typeName)"
        class="quantum-element"
        :modelGetter="() => element"
        @focused-element-commands="
          (value) => (focusedElementCommands.commands.value = value)
        "
        @move-cursor-out="(value) => grid.moveCrosshairOut(element, value)"
        @delete-element="document.deleteElement(element)"
      ></component>
    </div>
  </div>
</template>
<script lang="ts">
import {
  defineComponent,
  readonly,
  ref,
  Ref,
  nextTick,
  unref,
  onMounted,
} from "vue";
import {
  useDocument,
  UseQuantumDocument,
  QuantumDocumentElementTypes,
} from "../model/document/document";
import ExpressionElement, {
  ExpressionElementType,
} from "./elements/ExpressionElement.vue";
import ScopeElement, {
  ScopeElementType,
} from "./elements/ScopeStartElement.vue";
import {
  useFocusedElementCommands,
  ElementCommands,
} from "./elements/element-commands";
import { Vector2 } from "../model/vectors";
import { UseQuantumElement } from "../model/document/document-element";

function useClipboard<T extends QuantumDocumentElementTypes>(
  document: UseQuantumDocument<T>
) {
  function cut(ev: ClipboardEvent) {}
  function copy(ev: ClipboardEvent) {}
  function paste(ev: ClipboardEvent) {}
  return {
    cut,
    copy,
    paste,
  };
}

function useGrid<T extends QuantumDocumentElementTypes>(
  document: UseQuantumDocument<T>,
  inputElement: Ref<HTMLElement | undefined>,
  focusedElementCommands: Ref<ElementCommands | undefined>
) {
  const crosshairPosition = ref<Vector2>(new Vector2(2, 10));
  const showCrosshair = ref(true);

  function gridToStyle(gridPosition: Vector2 | Ref<Vector2>) {
    let pos = unref(gridPosition);
    return {
      left: pos.x * document.gridCellSize.x + "px",
      top: pos.y * document.gridCellSize.y + "px",
    };
  }

  function pointerDown(ev: PointerEvent) {
    if (ev.target == ev.currentTarget) {
      crosshairPosition.value = new Vector2(
        Math.round(ev.offsetX / document.gridCellSize.x),
        Math.round(ev.offsetY / document.gridCellSize.y)
      );
    }
  }

  function textInput(ev: InputEvent) {
    if (ev.isComposing) return;

    if (ev.data) {
      let element = document.createElement(ExpressionElementType.typeName, {
        position: crosshairPosition.value,
        resizeable: false,
      });
      document.setFocus(element);
      nextTick(() => {
        focusedElementCommands.value?.moveToStart?.();
        focusedElementCommands.value?.insert?.(ev.data + "");
      });
    }

    if (ev.currentTarget) {
      (ev.currentTarget as HTMLTextAreaElement).value = "";
    }
  }

  function keydown(ev: KeyboardEvent) {
    if (ev.isComposing) return;

    let direction = Vector2.zero;
    if (ev.key == "ArrowLeft") {
      direction = new Vector2(-1, 0);
    } else if (ev.key == "ArrowRight") {
      direction = new Vector2(1, 0);
    } else if (ev.key == "ArrowUp") {
      direction = new Vector2(0, -1);
    } else if (ev.key == "ArrowDown") {
      direction = new Vector2(0, 1);
    } else {
      return;
    }

    crosshairPosition.value = crosshairPosition.value.add(direction);
    focusUnderCrosshair();
  }

  function keyup(ev: KeyboardEvent) {
    if (ev.isComposing) return;
  }

  function moveCrosshairOut(element: UseQuantumElement, direction: Vector2) {
    let pos = element.position.value.add(
      new Vector2(
        direction.x > 0 ? element.size.value.x : 0,
        direction.y > 0 ? element.size.value.y : 0
      )
    );

    crosshairPosition.value = pos.add(direction);
    focusUnderCrosshair();
  }

  function focusUnderCrosshair() {
    // Focus crosshair
    inputElement.value?.focus();

    // Focus element under crosshair
    let blockToFocus = document.getElementAt(crosshairPosition.value);
    document.setFocus(blockToFocus);
  }

  return {
    crosshairPosition: readonly(crosshairPosition),
    showCrosshair,
    gridToStyle,
    pointerDown,
    textInput,
    keydown,
    keyup,

    moveCrosshairOut,
    focusUnderCrosshair,
  };
}

/**
 * To say with document-element type corresponds to which Vue.js component
 */
type TypeComponents<T extends UseQuantumDocument<any>> =
  T extends UseQuantumDocument<infer U> ? { [key in keyof U]: any } : any;

export default defineComponent({
  components: {
    ExpressionElement,
    ScopeElement,
  },
  setup() {
    const document = useDocument({
      ...ExpressionElementType.documentType,
      ...ScopeElementType.documentType,
    });

    const typeComponents: TypeComponents<typeof document> = {
      [ExpressionElementType.typeName]: ExpressionElement,
      [ScopeElementType.typeName]: ScopeElement,
    };

    const documentElement = ref<HTMLElement>();
    const documentInputElement = ref<HTMLElement>();

    const focusedElementCommands = useFocusedElementCommands();
    const grid = useGrid(
      document,
      documentInputElement,
      focusedElementCommands.commands
    );
    const clipboard = useClipboard(document);

    function log(ev: any) {
      console.log(ev);
    }

    function getTypeComponent(typeName: string) {
      return (typeComponents as any)[typeName];
    }

    return {
      document,
      documentElement,
      documentInputElement,

      focusedElementCommands,
      grid,
      clipboard,
      getTypeComponent,
      log,
    };
  },
});
</script>

<style scoped>
.quantum-document {
  background-color: var(--color);
  --grid-color: rgba(71, 162, 223, 0.26);
  --selected-background-color: rgba(68, 148, 202, 0.24);
  --selected-color: rgba(57, 131, 180, 0.459);
  background-size: var(--grid-cell-size-x) var(--grid-cell-size-y);
  background-image: linear-gradient(
      to right,
      var(--grid-color) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  position: relative;
  touch-action: none;

  height: 500px;
}

.quantum-block {
  position: absolute;
  min-width: 50px;
  padding: 4px;
  margin: 1px;
}

.quantum-block:hover {
  border: 1px solid var(--selected-color);
  margin: 0px;
}
.quantum-block:focus-within {
  border: 1px dashed var(--selected-color);
  margin: 0px;
}
.quantum-block.selected {
  border: 1px solid var(--selected-color);
  margin: 0px;
  background: var(--selected-background-color);
}
.quantum-block.selected:hover {
  cursor: move;
}

.quantum-document .input-element {
  transform: scale(0);
  resize: none;
  position: absolute;
  clip: rect(0 0 0 0);
  width: 0px;
  height: 0px;
}

.grid-crosshair {
  position: absolute;
  user-select: none;
  transform: translate(-50%, -50%);
  padding: 1px;
  font-family: Arial, Helvetica, sans-serif;
}
</style>