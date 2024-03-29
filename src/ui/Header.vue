<template>
  <header class="header">
    <a-row type="flex" justify="space-between" :style="{ height: '36px', lineHeight: '36px', paddingLeft: '20px' }">
      <a-col :span="8" :style="{ height: '36px' }">
        <a-space :style="{ height: '36px', alignItems: 'revert', gap: '0px' }" :size="0">
          <div :style="{ width: '10px' }" />
          <h3 @click="() => {}" :style="{ cursor: 'pointer', margin: 0, width: '110px' }">QuantumSheet</h3>
          <div :style="{ width: '16px' }" />
          <a-dropdown placement="bottomLeft" :trigger="['click']">
            <a-button ghost style="height: 36px; color: black">File</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="UI.fileInterface.promptNewFile()">
                  <a :style="{ color: 'black' }">New</a>
                </a-menu-item>
                <a-menu-item @click="UI.fileInterface.openFileOpenModal()">
                  <a :style="{ color: 'black' }">Open...</a>
                </a-menu-item>
                <a-menu-item @click="UI.fileInterface.openFileSaveModal()">
                  <a :style="{ color: 'black' }">Save as...</a>
                </a-menu-item>
                <a-menu-item @click="print()">
                  <a :style="{ color: 'black' }">Print...</a>
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
                <a-menu-item @click="() => (UI.fileInterface.documentPrefsModal.value = true)">
                  <a :style="{ color: 'black' }">Document Preferences</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </a-col>

      <a-col :style="{ height: '36px' }">
        <a-space :style="{ height: '36px' }">
          <p>v{{ pkg.version }} - <a href="https://github.com/stefnotch/quantum-sheet">View on GitHub</a></p>
          <div :style="{ width: '20px' }" />
        </a-space>
      </a-col>
    </a-row>
  </header>
  <teleport to="#modal">
    <!-- OPEN modal -->
    <a-modal v-model:visible="UI.fileInterface.fileOpenModal.value" title="Open File" ok-text="Open" @ok="UI.fileInterface.confirmFileOpenModal()">
      <a-textarea
        v-model:value="UI.fileInterface.serializedDocument.value"
        :auto-size="{ minRows: 8, maxRows: 20 }"
        :style="{ marginBottom: '20px' }"
      />
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
    <a-modal v-model:visible="UI.fileInterface.fileSaveModal.value" title="Save File" ok-text="Done" @ok="UI.fileInterface.closeFileSaveModal()">
      <a-textarea
        v-model:value="UI.fileInterface.serializedDocument.value"
        :auto-size="{ minRows: 8, maxRows: 20 }"
        :style="{ marginBottom: '20px' }"
      />
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
      v-model:visible="UI.fileInterface.documentPrefsModal.value"
      title="Document Prefereences"
      ok-text="Done"
      @ok="UI.fileInterface.closeDocPrefsModal()"
    >
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 12 }">
        <a-form-item label="Paper Style:">
          <div>
            <!-- Paper Style: -->
            <a-select
              v-model:value="docManager.currentDocument.value.options.paperStyle"
              @change="(value) => (docManager.currentDocument.value.options.paperStyle = value)"
            >
              <a-select-option value="standard">Standard</a-select-option>
              <a-select-option value="engineer">Engineering</a-select-option>
              <a-select-option value="printer">Printer</a-select-option>
            </a-select>
          </div>
        </a-form-item>
        <a-form-item label="Paper Size:">
          <div>
            <!-- Paper Size: -->
            <a-select
              v-model:value="docManager.currentDocument.value.options.paperSize"
              @change="(value) => (docManager.currentDocument.value.options.paperSize = value)"
            >
              <a-select-option value="A3">A3</a-select-option>
              <a-select-option value="A4">A4</a-select-option>
              <a-select-option value="A5">A5</a-select-option>
              <a-select-option value="ANSI_A">ANSI A (US Letter)</a-select-option>
              <a-select-option value="ANSI_B">ANSI B</a-select-option>
              <a-select-option value="ARCH_A">Arch A</a-select-option>
              <a-select-option value="ARCH_B">Arch B</a-select-option>
              <!-- <a-select-option value="Legal">Legal</a-select-option> -->
            </a-select>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </teleport>
</template>

<script lang="ts">
import { defineComponent, ref, inject, reactive } from 'vue'
import {
  Button,
  Grid,
  Row,
  Col,
  Space,
  Dropdown,
  Select,
  SelectOption,
  Form,
  FormItem,
  Modal,
  Menu,
  MenuItem,
  UploadDragger,
  Textarea,
} from 'ant-design-vue'
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import pkg from '../../package.json'

import * as UI from './ui'
import { useDocumentManager } from '../model/document/document-manager'

export default defineComponent({
  components: {
    InboxOutlined,
    DownloadOutlined,
    'a-row': Row,
    'a-col': Col,
    'a-grid': Grid,
    'a-space': Space,
    'a-dropdown': Dropdown,
    'a-select': Select,
    'a-select-option': SelectOption,
    'a-form': Form,
    'a-form-item': FormItem,
    'a-button': Button,
    'a-modal': Modal,
    'a-menu': Menu,
    'a-menu-item': MenuItem,
    'a-upload-dragger': UploadDragger,
    'a-textarea': Textarea,
  },
  setup(props, context) {
    // const UI = useUI()
    const docManager = useDocumentManager()

    function download(filename: string, text: string) {
      // defaults
      filename ? filename : (filename = 'quantum_document.qd')
      text ? text : (text = UI.fileInterface.serializedDocument.value)
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
        UI.fileInterface.serializedDocument.value = string
      })
      reader.readAsDataURL(file)
      return false // to prevent antd fron trying to upload somewhere
    }

    function print() {
      window.print()
    }

    return {
      UI,
      docManager,
      download,
      beforeUpload,
      pkg,
      print,
    }
  },
})
</script>

<style scoped>
.header {
  z-index: 1;
  width: 100%;
  box-shadow: 0px 0px 5px 0.1px #ccc;
  background: rgb(255, 255, 255);
}
.ant-menu-horizontal {
  line-height: 36px !important;
}
</style>
