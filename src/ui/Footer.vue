<template>
  <footer class="footer">
    <a-row type="flex" justify="space-between">
      <a-col :span="4">
        <a-space :style="{ height: '36px' }">
          <div :style="{ width: '20px' }" />
          <a-tooltip :mouseEnterDelay="1">
            <template #title> Calculate </template>
            <a-button
              size="small"
              :type="{ ready: 'primary', disconnected: 'dashed' }[UI.CASStatus.casState.value]"
              :danger="UI.CASStatus.casState.value === 'error'"
              @click="appActions.compute"
            >
              <!-- <CalculatorOutlined /> -->
              <!-- <a-icon :type="UI.CASStatus.icon.value" /> -->
              <Icon :icon="UI.CASStatus.icon.value" :id="UI.CASStatus.icon.value" />
            </a-button>
          </a-tooltip>
          <!-- Auto Calculate -->
          <a-tooltip>
            <template #title> Auto Calculate </template>
            <a-switch size="small" disabled />
          </a-tooltip>
        </a-space>
      </a-col>

      <a-col>
        <a-space :style="{ height: '36px' }">
          <!-- Number Format -->
          <!-- <a-select
            default-value="Decimal"
            style="width: 100px"
            size="small"
            @change="docActions.handleChangeNformat"
            dropdownClassName="custom-dropdown"
          >
            <a-select-option value="decimals"> Decimal </a-select-option>
            <a-select-option value="fractions"> Fraction </a-select-option>
          </a-select>
          <a-input-number
            v-if="docOptions.mathOptions.numberformat == 'decimals'"
            id="inputNumber"
            style="width: 60px"
            size="small"
            @change="docActions.handleChangeDecimalPlaces"
            :min="1"
            :max="10"
            :default-value="docOptions.mathOptions.decimals"
          /> -->
          <!-- Output Format -->
          <!-- <a-select
            default-value="LaTeX"
            style="width: 100px"
            size="small"
            @change="docActions.handleChangeOUTformat"
            :getPopupContainer="trigger => trigger.parentNode"
          >
            <a-select-option value="string">
              String
            </a-select-option>
            <a-select-option value="LaTeX">
              LaTeX
            </a-select-option>
          </a-select> -->

          <div :style="{ width: '20px' }" />
          <!-- Virtual Keyboard -->
          <!-- <a-tooltip>
            <template #title> Popout Keyboard </template>
            <a-button size="small" @click="appActions.togglevirtualkb">
              <AppstoreOutlined />
            </a-button>
          </a-tooltip> -->

          <div :style="{ width: '20px' }" />

          <!-- ScratchPad -->
          <!-- <a-tooltip>
            <template #title> Extended Work Area </template>
            <a-space>
              <ExportOutlined />
              <a-switch size="small" @change="appActions.handleChangeScratchPad" />
            </a-space>
          </a-tooltip> -->

          <!-- <div :style="{ width: '20px' }" /> -->

          <!-- Zoom -->
          <!-- <a-icon type="zoom-out" class="vert-icon" />
          <a-slider
            id="test"
            :min="50"
            :max="150"
            :step="25"
            :default-value="100"
            :style="{ width: '100px', marginTop: '6px', marginBottom: '6px' }"
            disabled
          />
          <a-icon type="zoom-in" class="vert-icon" /> -->

          <div :style="{ width: '20px' }" />
        </a-space>
      </a-col>
    </a-row>
  </footer>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, inject, watch } from 'vue'
import { ExportOutlined, CalculatorOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import { useUI } from './ui'
import { Icon } from './icon'

function useDocActions() {
  function handleChangeNformat() {
    return
  }
  function handleChangeOUTformat(value: any) {
    return
  }
  function handleChangeDecimalPlaces(value: any) {
    return
  }
  function updateDocOptions() {
    return
  }
  return {
    handleChangeNformat,
    handleChangeOUTformat,
    handleChangeDecimalPlaces,
  }
}
function useAppActions() {
  function handleChangeScratchPad(value: any) {
    return
  }
  function togglevirtualkb() {
    return
  }
  function compute() {
    return
  }
  return {
    handleChangeScratchPad,
    togglevirtualkb,
    compute,
  }
}

export default defineComponent({
  components: {
    ExportOutlined,
    CalculatorOutlined,
    AppstoreOutlined,
    Icon,
  },
  props: {},
  setup(props, context) {
    // TODO: This whole file is Garbage, clean this up.
    const appActions = useAppActions()
    const docActions = useDocActions()

    const UI = useUI()

    return {
      appActions,
      docActions,

      UI,
    }
  },
})
</script>

<style scoped>
.footer {
  background: white;
  position: fixed;
  bottom: 0;
  /* z-index: 1; */
  width: 100%;
  height: 36px;
  box-shadow: 0px 0px 5px 0.1px #ccc;
}
.ant-space-item {
  height: 24px !important;
}

.vert-icon {
  vertical-align: -0.225em !important;
}
</style>

<style>
/* monkypatch for antdv a-select dropdown overlapping box */
.custom-dropdown {
  top: calc(100vh - 106px) !important;
}
</style>
