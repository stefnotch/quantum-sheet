<template>
  <HelloWorld msg="Hello Vue 3.0 + Vite" />
</template>

<script>
import HelloWorld from "./components/HelloWorld.vue";
import { useCas } from "./cas/cas";
import { defineComponent } from "vue";
import pkg from "./../package.json";

export default defineComponent({
  name: "App",
  components: {
    HelloWorld
  },
  setup(props, context) {
    useCas();
    return {};
  }
});
</script>
