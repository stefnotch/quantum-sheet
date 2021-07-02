<template>
  <div>
    <a-layout>
      <Header />
      <a-layout class="content">
        <a-layout-content class="dwgtable center">
          <quantum-document></quantum-document>
          <!-- <LandingPage /> -->
        </a-layout-content>
      </a-layout>
      <Footer />
    </a-layout>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import pkg from './../package.json'
import QuantumDocument from './ui/QuantumDocument.vue'
import Header from './ui/Header.vue'
import Footer from './ui/Footer.vue'
import LandingPage from './ui/LandingPage.vue'

export default defineComponent({
  name: 'App',
  components: {
    LandingPage,
    QuantumDocument,
    Header,
    Footer
  },
  setup(props, context) {
    if (import.meta.env.PROD) {
      console.log(`${pkg.name} - ${pkg.version}`)
    }
    return {}
  }
})
</script>

<style scoped>
.content {
  /* Background color = Scrollbar color */
  background-color: #f1f1f1;
  position: absolute;
  /* 100% minus Header and footer */
  height: calc(100% - 36px - 36px);
  /* Header */
  top: 36px;
  /* Footer */
  bottom: 0px;
  width: 100%;
  overflow: auto;
}
.dwgtable {
  /* transition: margin 700ms; */
  min-width: 21cm;
  min-height: 29.7cm;
  background: white;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
  margin-top: 24px;
  margin-bottom: 24px;
}
.extended {
  width: 90vw !important;
}
.center {
  margin-left: auto;
  margin-right: auto;
}
</style>

<style>
.page {
  /* A4 Letter Size */
  width: 21cm;
  min-height: 29.7cm;
  /* border: 1px solid rgb(212, 212, 212); */
  box-shadow: 0px 0px 8px 2px #ccc;
}
</style>
