<template>
  <div class="header">
    <a-row type="flex" justify="space-between" :style="{ height: '36px', lineHeight: '36px', paddingLeft: '20px' }">
      <a-col :span="4">
        <a-space :style="{ height: '36px', alignItems: 'revert' }">
          <div :style="{ width: '10px' }" />
          <h3 style="margin 0; width: 110px" @click="() => {}" :style="{ cursor: 'pointer' }">QuantumSheet</h3>
          <div :style="{ width: '16px' }" />
          <a-dropdown placement="bottomLeft" :trigger="['click']">
            <a-button ghost style="height: 36px; color: black">File</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="UI.promptNewFile()">
                  <a :style="{ color: 'black' }">New</a>
                </a-menu-item>
                <a-menu-item @click="UI.openFileOpenModal()">
                  <a :style="{ color: 'black' }">Open</a>
                </a-menu-item>
                <a-menu-item @click="UI.openFileSaveModal()">
                  <a :style="{ color: 'black' }">Save as...</a>
                </a-menu-item>
                <a-menu-item @click="UI.promptCloseFile()">
                  <a :style="{ color: 'black' }">Close</a>
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
  <!-- OPEN modal -->
  <a-modal v-model:visible="UI.fileOpenModal.value" title="Open File" @ok="UI.closeFileOpenModal()">
    <!-- v-model="fileToUseString" -->
    <a-textarea :auto-size="{ minRows: 8, maxRows: 20 }" :style="{ marginBottom: '20px' }" />
    <!-- @change="handleUploadChange" :before-upload="beforeUpload" -->
    <a-upload-dragger name="file" :multiple="false">
      <p class="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p class="ant-upload-text">Click or drag file to this area to upload</p>
    </a-upload-dragger>
  </a-modal>
  <!-- SAVE modal -->
  <a-modal v-model:visible="UI.fileSaveModal.value" title="Save File" @ok="UI.closeFileSaveModal()">
    <a-textarea v-model:value="UI.serializedDocument.value" :auto-size="{ minRows: 8, maxRows: 20 }" :style="{ marginBottom: '20px' }" />
    <a-button type="primary" size="large" block @click="download()">
      <template #icon>
        <DownloadOutlined />
      </template>
      Download
    </a-button>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref, inject, reactive } from 'vue'
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons-vue'

import { useUI } from './ui'

export default defineComponent({
  components: {
    InboxOutlined,
    DownloadOutlined,
  },
  setup(props, context) {
    const UI = useUI()
    return {
      UI,
    }
  },
})
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
