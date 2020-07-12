<template>
  <div
    class="quantum-document"
    ref="documentElement"
    tabindex="-1"
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
      @input="createElement.input($event)"
      @focus="grid.setSelection(); grid.showCrosshair = true"
      @blur="grid.showCrosshair = false"
    ></textarea>
    <div
      class="grid-crosshair"
      :style="grid.gridToStyle(grid.crosshairPosition)"
      v-show="grid.showCrosshair"
      ref="documentCrosshairElement"
    >+</div>
    <div
      class="quantum-block"
      v-for="block in blocks"
      :key="block.id"
      :style="grid.gridToStyle(block.position)"
      :class="{'selected': block.selected }"
      :block-id="block.id"
      @pointerdown="grid.setSelection(block)"
    >
      <!--TODO: Only set the selection ^^ when I'm clicking on the border-->
      <component
        :is="elementTypes[block.type].component"
        class="quantum-element"
        :model-value="block.element"
        @update:model-value="value => block.element = value"
        :focused="block.focused"
        @update:focused="value => block.setFocused(value)"
        @focused-element-commands="value => focusedElementCommands.commands = value"
        @move-cursor-out="value => grid.moveCrosshairOut(block, value)"
        @delete-element="deleteBlock(block)"
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
  onMounted,
  onUnmounted,
  watch,
  shallowReadonly,
  nextTick,
  watchEffect,
  computed
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

function useCreateElement(
  document: QuantumDocument,
  crosshairPosition: Readonly<Ref<Vec2>>,
  focusedElementCommands: Ref<any>
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
      block.setFocused(true);
      // TODO:
      // - cursor coming up on your left, please focus
      // - insert the following character (just deal with it!) (that just needs to be a simple function which modifies the state...)
      //   - however, if it should handle inserting characters in an element that already has focus, it's not that simple
      nextTick(() => {
        focusedElementCommands.value["moveToStart"]();
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

function useGrid(
  document: QuantumDocument,
  crosshairElement: Ref<HTMLElement | undefined>
) {
  const crosshairPosition = ref<Vec2>({ x: 0, y: 0 });
  const showCrosshair = ref(true);

  function gridToStyle(gridPosition: Vec2) {
    return {
      left: gridPosition.x * document.gridCellSize.x + "px",
      top: gridPosition.y * document.gridCellSize.y + "px"
    };
  }

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

  function moveCrosshairOut(
    block: QuantumBlock<QuantumElemement>,
    direction: Vec2
  ) {
    let pos = {
      x: block.position.x + (direction.x > 0 ? block.size.x : 0),
      y: block.position.y + (direction.y > 0 ? block.size.y : 0)
    };

    crosshairPosition.value = {
      x: pos.x + direction.x,
      y: pos.y + direction.y
    };

    focusUnderCrosshair();
  }

  // TODO: Moving the crosshair with the arrow keys and also that check ^

  function focusUnderCrosshair() {
    // TODO: Focus on the textarea (so that the crosshair is guaranteed to show up)
    // TODO: Ask document which element is here and .setFocused(true)
    // If there is no element here, take away focus from everyone document.focusedElement.setFocused(false)
  }

  return {
    crosshairPosition: readonly(crosshairPosition),
    showCrosshair,
    gridToStyle,
    pointerDown,
    setSelection,
    moveCrosshairOut,
    focusUnderCrosshair
  };
}

function useFocusedElementCommands(document: QuantumDocument) {
  const commands = ref<any>({});

  return {
    commands
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
    const documentCrosshairElement = ref<HTMLElement>();

    const grid = useGrid(document, documentCrosshairElement);
    const clipboard = useClipboard(document);
    const focusedElementCommands = useFocusedElementCommands(document);
    const createElement = useCreateElement(
      document,
      grid.crosshairPosition,
      focusedElementCommands.commands
    );

    function log(ev: any) {
      console.log(ev);
    }
    return {
      documentElement,
      documentInputElement,
      documentCrosshairElement,

      elementTypes,

      blocks: document.blocks,
      deleteBlock: document.deleteBlock,

      grid,
      clipboard,
      createElement,
      focusedElementCommands,

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

.quantum-block {
  position: absolute;
  min-width: 50px;
  padding: 2px;
  margin: -2px;
}
/* TODO: Nicer styles*/
.quantum-block:hover {
  border: 1px solid var(--selected-color);
  margin: -3px;
  /*cursor: move;*/
}
.quantum-block > *:hover {
  /*cursor: initial;*/
}
/*
.quantum-block.selected {
  border: 1px solid var(--selected-color);
  margin: 1px;
  background: var(--selected-background-color);
}
.quantum-block:focus,
.quantum-block:focus-within {
  border: 1px dashed var(--selected-color);
  margin: 1px;
}*/

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