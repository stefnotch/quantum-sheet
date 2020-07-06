<template>
  <div>Expression Element</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import {
  ExpressionElement,
  ElementType,
  ElementFunctions
} from "../../model/document/elements/expression-element";

export {
  ElementType as ExpressionElementType,
  ElementFunctions as ExpressionElementFunctions
};

export default defineComponent({
  setup() {
    return {};
  }
});
</script>
<style scoped>
</style>