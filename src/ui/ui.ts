import { readonly, shallowReactive, shallowRef, ref, watch, Ref, inject } from 'vue'
import emitter from '../services/eventbus'
// import { document } from '../model/document/'
function useUIPreferences() {
  // TODO: Theme - Light, Dark, Custom?
  // TODO: Zoom
}

function useDocumentPreferences() {
  // TODO: Paper Style
  // TODO: Result Notation Style - Decimal (# Digits), Scientific, Fraction, other?
  // TODO: Result Text Style? - Text, LaTeX
  // TODO: Default Units
}

// function useDocument() {
//   return { document }
// }

export function useUI() {
  // const $emitter = inject('$emitter')
  const fileNewModal: Ref<boolean> = ref(false)
  const fileSaveModal: Ref<boolean> = ref(false)
  const fileOpenModal: Ref<boolean> = ref(false)
  const fileConfirmClose: Ref<boolean> = ref(false)
  const serializedDocument: Ref<string> = ref('')
  // TODO: UI Preferences
  // TODO: Document Preferences

  emitter.on('update-document-data', (data) => {
    console.log('data', data)
    serializedDocument.value = data
  })

  function promptNewFile() {
    fileNewModal.value = true
  }
  function promptCloseFile() {
    fileConfirmClose.value = true
  }
  // TODO: Close Confirm
  function openFileSaveModal() {
    fileSaveModal.value = true
    console.log(serializedDocument)
    emitter.emit('serialize-document')
    console.log(serializedDocument)
  }
  function closeFileSaveModal() {
    fileSaveModal.value = true
  }
  function openFileOpenModal() {
    fileOpenModal.value = true
  }
  function closeFileOpenModal() {
    fileOpenModal.value = false
  }
  return {
    promptNewFile,
    promptCloseFile,
    openFileSaveModal,
    closeFileSaveModal,
    fileSaveModal,
    openFileOpenModal,
    closeFileOpenModal,
    fileOpenModal,

    serializedDocument,
  }
}
