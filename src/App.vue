<template>
  <a-layout>
    <Header />
    <a-layout class="content">
      <a-layout-content class="drawingtable center">
        <!-- TODO: Add an "id" property (with a uuid) so that we can recreate the document whenever we want a new document -->
        <quantum-document @quantum-document="(v) => docManager.registerQuantumDocument(v)"></quantum-document>
        <!-- <LandingPage /> -->
      </a-layout-content>
    </a-layout>
    <Footer />
  </a-layout>
</template>

<script lang="ts">
import { defineComponent, ref, provide, nextTick, onMounted, Ref } from 'vue'
import pkg from './../package.json'
import QuantumDocument from './ui/QuantumDocument.vue'
import Header from './ui/Header.vue'
import Footer from './ui/Footer.vue'
import LandingPage from './ui/LandingPage.vue'
import { useDocumentManager } from './model/document/document-manager'
import { UseQuantumDocument } from './model/document/document'
import { useUrlSearchParams } from '@vueuse/core'
import * as Notification from './ui/notification'

window.addEventListener('error', (ev) => {
  Notification.error('Unhandled error', ev.error)
})
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled error (promise)', ev.reason)
  Notification.error('Unhandled error (promise)', ev.reason)
})

export default defineComponent({
  name: 'App',
  components: {
    LandingPage,
    QuantumDocument,
    Header,
    Footer,
  },
  setup(props, context) {
    if (import.meta.env.PROD) {
      console.log(`${pkg.name} - ${pkg.version}`)
    }
    const urlParams = useUrlSearchParams('history')
    const docManager = useDocumentManager()

    // Allow loading a document from a URL
    const documentUrl = urlParams['document-url']
    if (documentUrl && typeof documentUrl === 'string') {
      // TODO: Warning/popup if a document is already loaded
      fetch(documentUrl)
        .then((v) => v.text())
        .then((v) => {
          docManager.loadDocument(v)
        })
    }

    return { docManager }
  },
})
</script>

<style scoped>
.content {
  /* Background color = Scrollbar color */
  background-color: #f1f1f1;
  display: flex;
  /* Header and footer */
  padding-top: 36px;
  padding-bottom: 36px;
  /* Sides */
  padding-left: 12px;
  padding-right: 12px;
  overflow: auto;
}

.drawingtable {
  min-height: min-content;
  min-width: min-content;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
  margin-top: 24px;
  margin-bottom: 24px;
  /*
  TODO: For zooming
  1. The background ends up having weird aliasing effects
  2. The dragging doesn't work properly
  3. The document isn't centered when zooming out
  4. The container doesn't properly do the overflow stuff when zooming in (double scrollbar, cannot get to bottom)
  transform: scale(0.6);
  transform-origin: 0% 0%;
  */
}

.center {
  margin-left: auto;
  margin-right: auto;
}
</style>
