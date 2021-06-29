<template>
  <div class="header">
    <a-row type="flex" justify="space-between" :style="{ height: '36px', lineHeight: '36px', paddingLeft: '20px' }">
      <a-col :span="4">
        <a-space :style="{ height: '36px', alignItems: 'revert' }">
          <div :style="{ width: '10px' }" />
          <h3 style="margin 0; width: 110px" @click=";" :style="{ cursor: 'pointer' }">QuantumSheet</h3>
          <div :style="{ width: '16px' }" />
          <a-dropdown placement="bottomLeft">
            <a-button ghost style="height: 36px; color: black;">File</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item>
                  <a target="_blank" rel="noopener noreferrer" @click=";" :style="{ color: 'black'}">New</a>
                </a-menu-item>
                <a-menu-item>
                  <a target="_blank" rel="noopener noreferrer" @click=";" :style="{ color: 'black'}">Open</a>
                </a-menu-item>
                <a-menu-item>
                  <a target="_blank" rel="noopener noreferrer" @click=";" :style="{ color: 'black'}">Save as...</a>
                </a-menu-item>
                <a-menu-item>
                  <a target="_blank" rel="noopener noreferrer" @click=";" :style="{ color: 'black'}">Close</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </a-col>

      <a-col>
        <a-space :style="{ height: '36px' }">
          <div :style="{ width: '20px' }" />
        </a-space>
      </a-col>
    </a-row>
  </div>
</template>

<script>

export default {
  name: 'Page',
  components: {},
  setup(props, context) {
    return {};
  },

}
</script>

<style scoped>
.header {
  position: fixed;
  z-index: 1;
  width: 100%;
  box-shadow: 0px 0px 5px 0.1px #ccc;
  background: rgb(255, 255, 255);
}
.ant-menu-horizontal {
  line-height: 36px !important;
}
</style>
