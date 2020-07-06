<template>
  <div>
    <quantum-document></quantum-document>
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";
import pkg from "./../package.json";
import QuantumDocument from "./ui/QuantumDocument.vue";

export default defineComponent({
  name: "App",
  components: {
    QuantumDocument
  },
  setup(props, context) {
    return {};
  }
});
</script>
