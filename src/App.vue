<template>
  <HelloWorld msg="Hello Vue 3.0 + Vite" />
</template>

<script>
import HelloWorld from "./components/HelloWorld.vue";
import { pyodideWorker } from "./cas/pyodide-loader";

export default {
  name: "App",
  components: {
    HelloWorld
  }
};
</script>
