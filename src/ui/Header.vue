<template>
  <div class="header">
    <a-row type="flex" justify="space-between" :style="{ height: '36px', lineHeight: '36px', paddingLeft: '20px' }">
      <a-col :span="4">
        <a-space :style="{ height: '36px', alignItems: 'revert' }">
          <div :style="{ width: '10px' }" />
          <h3 @click="() => {}" :style="{ cursor: 'pointer', margin: 0, width: '110px' }">QuantumSheet</h3>
          <div :style="{ width: '16px' }" />
          <a-dropdown placement="bottomLeft" :trigger="['click']">
            <a-button ghost style="height: 36px; color: black">File</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="UI.promptNewFile()">
                  <a :style="{ color: 'black' }">New</a>
                </a-menu-item>
                <a-menu-item @click="UI.openFileOpenModal()">
                  <a :style="{ color: 'black' }">Open...</a>
                </a-menu-item>
                <a-menu-item @click="UI.openFileSaveModal()">
                  <a :style="{ color: 'black' }">Save as...</a>
                </a-menu-item>
                <!-- <a-menu-item @click="UI.promptCloseFile()">
                  <a :style="{ color: 'black' }">Close</a>
                </a-menu-item> -->
              </a-menu>
            </template>
          </a-dropdown>
          <a-dropdown placement="bottomLeft" :trigger="['click']">
            <a-button ghost style="height: 36px; color: black">Edit</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="() => (UI.documentPrefsModal.value = true)">
                  <a :style="{ color: 'black' }">Document Preferences</a>
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
  <teleport to="#modal">
    <!-- OPEN modal -->
    <a-modal v-model:visible="UI.fileOpenModal.value" title="Open File" ok-text="Open" @ok="UI.confirmFileOpenModal()">
      <a-textarea v-model:value="UI.serializedDocument.value" :auto-size="{ minRows: 8, maxRows: 20 }" :style="{ marginBottom: '20px' }" />
      <a-upload-dragger name="file" :multiple="false" :before-upload="beforeUpload">
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">Click or drag file to this area to upload</p>
      </a-upload-dragger>
    </a-modal>
  </teleport>
  <teleport to="#modal">
    <!-- SAVE modal -->
    <a-modal v-model:visible="UI.fileSaveModal.value" title="Save File" ok-text="Done" @ok="UI.closeFileSaveModal()">
      <a-textarea v-model:value="UI.serializedDocument.value" :auto-size="{ minRows: 8, maxRows: 20 }" :style="{ marginBottom: '20px' }" />
      <a-button type="primary" size="large" block @click="download()">
        <template #icon>
          <DownloadOutlined />
        </template>
        Download
      </a-button>
    </a-modal>
  </teleport>
  <teleport to="#modal">
    <!-- Document Preferences Modal -->
    <a-modal
      v-if="docManager.currentDocument.value"
      v-model:visible="UI.documentPrefsModal.value"
      title="Document Prefereences"
      ok-text="Done"
      @ok="UI.closeDocPrefsModal()"
    >
      <a-space direction="vertical">
        <div>
          Paper Style:
          <a-select
            v-model:value="docManager.currentDocument.value.options.paperStyle"
            style="width: 120px"
            @change="(value) => (docManager.currentDocument.value.options.paperStyle = value)"
          >
            <a-select-option value="standard">Standard</a-select-option>
            <a-select-option value="engineer">Engineering</a-select-option>
          </a-select>
        </div>
        <div>
          Paper Size:
          <a-select
            v-model:value="docManager.currentDocument.value.options.paperSize"
            style="width: 120px"
            @change="(value) => (docManager.currentDocument.value.options.paperSize = value)"
          >
            <a-select-option value="Letter">Letter</a-select-option>
            <a-select-option value="Legal">Legal</a-select-option>
          </a-select>
        </div>
      </a-space>
    </a-modal>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, ref, inject, reactive } from 'vue'
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons-vue'

import { useUI } from './ui'
import { useDocumentManager } from '../model/document/document-manager'

export default defineComponent({
  components: {
    InboxOutlined,
    DownloadOutlined,
  },
  setup(props, context) {
    const UI = useUI()
    const docManager = useDocumentManager()

    function download(filename: string, text: string) {
      // defaults
      filename ? filename : (filename = 'quantum_document.qd')
      text ? text : (text = UI.serializedDocument.value)
      var element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      element.setAttribute('download', filename)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }

    function beforeUpload(file) {
      // let name = file.name
      // let path = file.path
      // let size = file.size
      const reader = new FileReader()
      reader.addEventListener('load', (event) => {
        let blob = event?.target?.result
        let data = (blob as string)?.split(',')
        let base64 = data[1]
        let string = atob(base64)
        UI.serializedDocument.value = string
      })
      reader.readAsDataURL(file)
      return false // to prevent antd fron trying to upload somewhere
    }

    return {
      UI,
      docManager,
      download,
      beforeUpload,
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
