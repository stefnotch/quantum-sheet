import { readonly, shallowReactive, shallowRef, ref, watch, Ref, inject } from 'vue'
import { useDocumentManager } from '../model/document/document-manager'

const docManager = useDocumentManager()

function useUIPreferences() {
  // TODO: Theme - Light, Dark, Custom?
  // TODO: Zoom
  // TODO: Page Numbers?
}

export function useUI() {
  // const $emitter = inject('$emitter')
  const fileNewModal: Ref<boolean> = ref(false)
  const fileSaveModal: Ref<boolean> = ref(false)
  const fileOpenModal: Ref<boolean> = ref(false)
  const documentPrefsModal: Ref<boolean> = ref(false)

  const fileConfirmClose: Ref<boolean> = ref(false)
  const serializedDocument: Ref<string> = ref('')
  // TODO: UI Preferences

  function promptNewFile() {
    fileNewModal.value = true
  }
  function promptCloseFile() {
    fileConfirmClose.value = true
  }
  // TODO: Close Confirm
  function openFileSaveModal() {
    console.log('Saving: ', docManager.quantumDocument.value)
    serializedDocument.value = docManager.saveDocument()
    fileSaveModal.value = true
  }
  function closeFileSaveModal() {
    fileSaveModal.value = false
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

  function closeDocPrefsModal() {
    documentPrefsModal.value = false
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

    closeDocPrefsModal,
    documentPrefsModal,

    serializedDocument,
  }
}
