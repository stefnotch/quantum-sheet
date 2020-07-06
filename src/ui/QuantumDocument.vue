<template>
  <div class="quantum-document" ref="documentElement">
    <selection-pointer class="selection-pointer"></selection-pointer>
    <div
      class="quantum-element"
      v-for="block in blocks"
      :key="block.id"
      :style="{top:(block.position.y * grid.cellSize.y) + 'px'}"
    >
      <component :is="elementTypes[block.type]"></component>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, readonly, ref } from "vue";
import SelectionPointer from "./SelectionPointer.vue";

import { useDocument, QuantumElementTypes } from "../model/document/document";
import ExpressionElement, {
  ExpressionElementType,
  ExpressionElementFunctions
} from "./elements/ExpressionElement.vue";
import { QuantumElementFunctions } from "../model/document/document-element";
import { Vec2 } from "../model/document/vectors";

function useGrid() {
  const cellSize: Vec2 = { x: 20, y: 20 };
  return { cellSize };
}

function useSelectionPointer(gridCellSize: Vec2) {}

export default defineComponent({
  components: {
    ExpressionElement,
    SelectionPointer
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
    return {
      documentElement,
      blocks: document.blocks,
      elementTypes,
      grid
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

  height: 500px;
}

.quantum-element {
  position: absolute;
}

.selection-pointer {
  position: absolute;
}
</style>