<template>
  <div class="scope-start"></div>
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, shallowRef } from 'vue'
import { UseScopeElement, ScopeElementType } from '../../model/document/elements/scope-element'
import { ElementCommands } from './element-commands'
import { Vector2 } from '../../model/vectors'

export { ScopeElementType }

export default defineComponent({
  props: {
    modelGetter: {
      type: Function as PropType<() => UseScopeElement>,
      required: true,
    },
  },
  emits: {
    'focused-element-commands': (value: ElementCommands | undefined) => true,
  },
  setup(props, context) {
    const scopeElement = props.modelGetter()

    return {
      element: scopeElement,
    }
  },
})
</script>
<style scoped></style>
