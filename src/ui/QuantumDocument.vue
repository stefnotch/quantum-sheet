<template>
  <div
    class="quantum-document"
    ref="documentElement"
    tabindex="-1"
    v-on:pointerdown="selection.pointerDown($event)"
    v-on:paste="clipboard.paste"
    v-on:focus="documentInputElement.focus()"
  >
    <textarea
      class="input-element"
      ref="documentInputElement"
      autofocus
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      v-on:input="createElement.input($event)"
      v-on:focus="selection.setSelection(); selection.showCrosshair = true"
      v-on:blur="selection.showCrosshair = false"
    ></textarea>
    <div
      class="selection-crosshair"
      :style="grid.gridToStyle(selection.crosshairPosition)"
      v-show="selection.showCrosshair"
    >+</div>
    <div
      class="quantum-element"
      v-for="block in blocks"
      :key="block.id"
      :style="grid.gridToStyle(block.position)"
      :class="{'selected': block.selected }"
      tabindex="-1"
      v-bind:block-id="block.id"
      v-on:pointerdown="selection.setSelection(block)"
    >
      <!--TODO: Only set the selection ^^ when I'm clicking on the border-->
      <component :is="elementTypes[block.type].component"></component>
    </div>
  </div>
</template>
<script lang="ts">
import {
  defineComponent,
  readonly,
  ref,
  Ref,
  onMounted,
  onUnmounted,
  watch,
  shallowReadonly,
  nextTick
} from "vue";

import {
  useDocument,
  QuantumElementTypes,
  QuantumDocument,
  QuantumBlock
} from "../model/document/document";
import ExpressionElement, {
  ExpressionElementType,
  ExpressionElementFunctions
} from "./elements/ExpressionElement.vue";
import {
  QuantumElementFunctions,
  QuantumElemement
} from "../model/document/document-element";
import { Vec2 } from "../model/document/vectors";

function useGrid(document: QuantumDocument) {
  function gridToStyle(gridPosition: Vec2) {
    return {
      left: gridPosition.x * document.gridCellSize.x + "px",
      top: gridPosition.y * document.gridCellSize.y + "px"
    };
  }

  return { gridToStyle };
}

function useCreateElement(
  document: QuantumDocument,
  crosshairPosition: Ref<Vec2>,
  documentElement: Ref<HTMLElement | undefined>
) {
  function input(ev: InputEvent) {
    if (ev.isComposing) return;

    let data = ev.data;
    let inputType = ev.inputType;

    if (data) {
      let block = document.createBlock(ExpressionElementType, {
        position: crosshairPosition.value,
        resizeable: false
      });

      nextTick(() => {
        if (documentElement?.value) {
          for (let element of documentElement?.value.children) {
            if (element.getAttribute("block-id") == block.id) {
              (element as HTMLElement)?.focus();
              break;
            }
          }
        }
      });
    }

    if (ev.currentTarget) {
      (ev.currentTarget as HTMLTextAreaElement).value = "";
    }
  }

  return {
    input
  };
}

function useClipboard(document: QuantumDocument) {
  function cut(ev: ClipboardEvent) {}
  function copy(ev: ClipboardEvent) {}
  function paste(ev: ClipboardEvent) {}
  return {
    cut,
    copy,
    paste
  };
}

function useSelection(document: QuantumDocument) {
  const crosshairPosition = ref<Vec2>({ x: 0, y: 0 });
  const showCrosshair = ref(true);

  function pointerDown(ev: PointerEvent) {
    if (ev.target == ev.currentTarget) {
      crosshairPosition.value = {
        x: Math.round(ev.offsetX / document.gridCellSize.x),
        y: Math.round(ev.offsetY / document.gridCellSize.y)
      };
    }
  }

  function setSelection(...blocks: QuantumBlock<QuantumElemement>[]) {
    document.selectedBlocks.forEach(v => v.setSelected(false));
    blocks.forEach(v => v.setSelected(true));
  }

  return {
    crosshairPosition,
    showCrosshair,
    setSelection,
    pointerDown
  };
}

export default defineComponent({
  components: {
    ExpressionElement
  },
  setup() {
    const elementTypes = shallowReadonly<QuantumElementTypes>({
      [ExpressionElementType]: {
        component: ExpressionElement,
        functions: ExpressionElementFunctions
      }
    });

    const document = useDocument(elementTypes);
    const documentElement = ref<HTMLElement>();
    const documentInputElement = ref<HTMLElement>();

    const grid = useGrid(document);
    const selection = useSelection(document);

    const clipboard = useClipboard(document);
    const createElement = useCreateElement(
      document,
      selection.crosshairPosition,
      documentElement
    );

    function log(ev: any) {
      console.log(ev);
    }
    return {
      documentElement,
      documentInputElement,

      elementTypes,

      blocks: document.blocks,

      grid,
      selection,
      clipboard,
      createElement,

      log
    };
  }
});
</script>
<style scoped>
.quantum-document {
  --grid-color: rgba(71, 162, 223, 0.26);
  --selected-background-color: rgba(68, 148, 202, 0.24);
  --selected-color: rgba(57, 131, 180, 0.459);
  background-size: 20px 20px;
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

.quantum-element {
  position: absolute;
}
/* TODO: Nicer styles*/
.quantum-element:hover {
  outline: 1px solid var(--selected-color);
}
.quantum-element.selected {
  outline: 1px solid var(--selected-color);
  background: var(--selected-background-color);
}
.quantum-element:focus {
  outline: 1px dashed var(--selected-color);
}

.quantum-document .input-element {
  transform: scale(0);
  resize: none;
  position: absolute;
  clip: rect(0 0 0 0);
  width: 0px;
  height: 0px;
}

.selection-crosshair {
  position: absolute;
  user-select: none;
  transform: translate(-50%, -50%);
  padding: 1px;
  font-family: Arial, Helvetica, sans-serif;
}
</style>