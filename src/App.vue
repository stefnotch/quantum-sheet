<template>
  <div>
    <a-layout>
      
    <!-- <a-layout-header> -->
      <Header />
    <!-- </a-layout-header> -->
      
    <a-layout class="content">
      <a-layout-content class="dwgtable center">
        <!-- <div :style="{ height: '100%' }"> -->
        <quantum-document></quantum-document>
        </a-layout-content>
        </a-layout>
      <!-- <Footer /> -->
    </a-layout>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import pkg from "./../package.json";
import QuantumDocument from "./ui/QuantumDocument.vue";
import Header from "./ui/Header.vue";


export default defineComponent({
  name: "App",
  components: {
    QuantumDocument,
    Header,
    // Footer
  },
  setup(props, context) {
    if (import.meta.env.PROD) {
      console.log(`${pkg.name} - ${pkg.version}`);
    }
    return {};
  },
});
</script>

<style scoped>
.content {
  position: absolute;
  height: calc(100% - 36px);
  width: 100%;
  top: 36px;
  overflow: auto;
}
.dwgtable {
  /* transition: margin 700ms; */
  width: 21cm;
  min-height: 29.7cm;
  background: white;
  /* border: 0.5px solid rgb(212, 212, 212); */
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
  margin-top: 24px;
  margin-bottom: 24px;
  
}
.withscratchpad {
  width: 90vw !important;
}
.center {
  margin-left: auto;
  margin-right: auto;
  /* border: 0.5px solid rgb(212, 212, 212); */
}
</style>

<style>
.page {
  /* A4 Letter Size */
  width: 21cm;
  /* width: 90vw; */
  min-height: 29.7cm;
  /* border: 1px solid rgb(212, 212, 212); */
  box-shadow: 0px 0px 8px 2px #ccc;
  overflow-x: revert !important;
  /* margin-bottom: 10px */
  /* background: white; */
}
</style>