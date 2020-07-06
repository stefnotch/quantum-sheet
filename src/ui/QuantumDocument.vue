<template>
  <div class="quantum-document" ref="documentElement">
    <div class="selection-crosshair" :style="grid.gridToStyle(selection.crosshairPosition)">+</div>
    <div
      class="quantum-element"
      v-for="block in blocks"
      :key="block.id"
      :style="grid.gridToStyle(block.position)"
    >
      <component :is="elementTypes[block.type]"></component>
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
  watch
} from "vue";

import { useDocument, QuantumElementTypes } from "../model/document/document";
import ExpressionElement, {
  ExpressionElementType,
  ExpressionElementFunctions
} from "./elements/ExpressionElement.vue";
import { QuantumElementFunctions } from "../model/document/document-element";
import { Vec2 } from "../model/document/vectors";

function useGrid() {
  const cellSize: Vec2 = readonly({ x: 20, y: 20 });

  function gridToStyle(gridPosition: Vec2) {
    return {
      left: gridPosition.x * cellSize.x + "px",
      top: gridPosition.y * cellSize.y + "px"
    };
  }

  return { cellSize, gridToStyle };
}

function useSelection(
  gridCellSize: Vec2,
  documentElement: Ref<HTMLElement | undefined>
) {
  const crosshairPosition = ref<Vec2>({ x: 0, y: 0 });

  function pointerDown(ev: PointerEvent) {
    if (ev.target == documentElement.value) {
      crosshairPosition.value = {
        x: Math.round(ev.offsetX / gridCellSize.x),
        y: Math.round(ev.offsetY / gridCellSize.y)
      };
    }
  }

  onMounted(() => {
    watch(
      documentElement,
      (element, oldElement) => {
        oldElement?.removeEventListener("pointerdown", pointerDown);
        element?.addEventListener("pointerdown", pointerDown);
      },
      { immediate: true }
    );
  });
  onUnmounted(() => {
    documentElement.value?.removeEventListener("pointerdown", pointerDown);
  });

  return {
    crosshairPosition
  };
}

export default defineComponent({
  components: {
    ExpressionElement
  },
  setup() {
    const elementTypes = readonly<QuantumElementTypes>({
      ExpressionElementType: {
        component: ExpressionElement,
        functions: ExpressionElementFunctions
      }
    });

    const document = useDocument(elementTypes);
    const documentElement = ref<HTMLElement>();
    const grid = useGrid();
    const selection = useSelection(grid.cellSize, documentElement);

    return {
      documentElement,
      blocks: document.blocks,
      elementTypes,
      grid,
      selection
    };
  }
});
</script>
<style scoped>
.quantum-document {
  --grid-color: rgba(71, 162, 223, 0.26);
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

.selection-crosshair {
  position: absolute;
  user-select: none;
  transform: translate(-50%, -50%);
  padding: 1px;
  font-family: Arial, Helvetica, sans-serif;
}
</style>