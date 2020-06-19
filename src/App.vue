<template>
  <div>
    <HelloWorld msg="Hello Vue 3.0 + Vite" />
    <textarea v-model="pythonCode"></textarea>
  </div>
</template>

<script>
import HelloWorld from "./components/HelloWorld.vue";
import { useCas } from "./cas/cas";
import { defineComponent, ref } from "vue";
import pkg from "./../package.json";

export default defineComponent({
  name: "App",
  components: {
    HelloWorld
  },
  setup(props, context) {
    let { cas } = useCas();
    const pythonCode = ref("");

    return {
      pythonCode
    };
  }
});
</script>
