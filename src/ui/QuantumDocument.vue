<template>
  <div class="quantum-document">
    <div class="quantum-element" v-for="element in elements" :key="element.id">
      <component :is="elementTypes[element.type]"></component>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, readonly } from "vue";
import { useDocument } from "../model/document/document";
import { QuantumElemement } from "../model/document/element";
import ExpressionElement, {
  ElementType as ExpressionElementType
} from "./elements/ExpressionElement.vue";

export default defineComponent({
  setup() {
    const elementTypes = readonly({
      ExpressionElementType: ExpressionElement
    });

    let document = useDocument();
    return {
      elements: document.elements,
      elementTypes
    };
  }
});
</script>
<style scoped>
.quantum-document {
  background-size: 40px 40px;
  background-image: linear-gradient(to right, grey 1px, transparent 1px),
    linear-gradient(to bottom, grey 1px, transparent 1px);

  /*background-image: radial-gradient(circle, #000000 1px, rgba(0, 0, 0, 0) 1px);*/
}
</style>