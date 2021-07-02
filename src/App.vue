<template>
  <div>
    <quantum-document></quantum-document>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import pkg from './../package.json'
import QuantumDocument from './ui/QuantumDocument.vue'

export default defineComponent({
  name: 'App',
  components: {
    QuantumDocument,
  },
  setup(props, context) {
    if (import.meta.env.PROD) {
      console.log(`${pkg.name} - ${pkg.version}`)
    }
    return {}
  },
})
</script>
