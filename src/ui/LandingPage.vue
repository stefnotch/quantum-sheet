<template>
  <div class="landing page">
    <div style="width: 100%; display: block; height: 50px"></div>
    <a-row style="padding: 64px" type="flex" justify="space-around">
      <a-col>
        <a-button type="primary" size="large" @click="promptnewfile()" style="width: 200px; height: 100px; margin-bottom: 20px">
          <!-- <a-icon type="file-add" /> -->
          <FileAddOutlined />
          New
        </a-button>
        <br />
        <a-button type="primary" size="large" @click="promptopenfile()" style="width: 200px; height: 100px">
          <!-- <a-icon type="folder-open" /> -->
          <FolderOpenOutlined />
          Open
        </a-button>
      </a-col>
      <a-col>
        <p>Open <a @click="openfile(exampleFile)">Example Sheet</a></p>
        <p>Read <a target="_blank" href="https://github.com/stefnotch/quantum-sheet">Documentation</a></p>
        <p>View <a target="_blank" href="https://github.com/stefnotch/quantum-sheet">Source Code</a></p>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts">
import { FolderOpenOutlined, FileAddOutlined } from '@ant-design/icons-vue'

export default {
  name: 'FrontPage',
  components: {
    FileAddOutlined,
    FolderOpenOutlined
  },
  props: {},
  data() {
    return {}
  },
  mounted: function () {},
  beforeDestroy() {},
  methods: {
    promptopenfile(file: any) {
      EventBus.$emit('promptopenfile', file)
    },
    openfile(file: any) {
      EventBus.$emit('openfile', file)
    },
    promptnewfile() {
      EventBus.$emit('promptnewfile')
    }
  },
  computed: {}
}
</script>

<style scoped>
.landing {
  /* background: white;
  min-height: 50vh;
  box-shadow: 0px 0px 5px 0.1px #ccc; */
}
</style>
