import { readonly, shallowReactive, shallowRef, ref, watch, Ref, inject } from 'vue'
import { useDocumentManager } from '../model/document-manager'

const docManager = useDocumentManager()

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

export function useUI() {
  // const $emitter = inject('$emitter')
  const fileNewModal: Ref<boolean> = ref(false)
  const fileSaveModal: Ref<boolean> = ref(false)
  const fileOpenModal: Ref<boolean> = ref(false)
  const fileConfirmClose: Ref<boolean> = ref(false)
  const serializedDocument: Ref<string> = ref('')
  // TODO: UI Preferences
  // TODO: Document Preferences

  function promptNewFile() {
    fileNewModal.value = true
  }
  function promptCloseFile() {
    fileConfirmClose.value = true
  }
  // TODO: Close Confirm
  function openFileSaveModal() {
    console.log('saving', docManager.currentDocument)
    serializedDocument.value = docManager.saveDocument()
    fileSaveModal.value = true
    console.log(serializedDocument)
  }
  function closeFileSaveModal() {
    fileSaveModal.value = true
  }
  function openFileOpenModal() {
    serializedDocument.value = ''
    fileOpenModal.value = true
  }
  function confirmFileOpenModal() {
    // TODO: Loading
    docManager.loadDocument(serializedDocument.value)
    fileOpenModal.value = false
  }
  return {
    promptNewFile,
    promptCloseFile,
    openFileSaveModal,
    closeFileSaveModal,
    fileSaveModal,
    openFileOpenModal,
    confirmFileOpenModal,
    fileOpenModal,

    serializedDocument,
  }
}
