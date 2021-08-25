import { ref, Ref, computed } from 'vue'
import { useDocumentManager } from '../model/document/document-manager'

const casState = ref('disconnected')

const docManager = useDocumentManager()
const fileNewModal: Ref<boolean> = ref(false)
const fileSaveModal: Ref<boolean> = ref(false)
const fileOpenModal: Ref<boolean> = ref(false)
const documentPrefsModal: Ref<boolean> = ref(false)

const fileConfirmClose: Ref<boolean> = ref(false)
const serializedDocument: Ref<string> = ref('')

// TODO: UI Preferences
function useUIPreferences() {
  // TODO: Theme - Light, Dark, Custom? (We can probably use https://vueuse.org/core/usepreferreddark/ )
  // TODO: Zoom
  // TODO: Page Numbers?
}

function useCasStatus() {
  const statusIcons = {
    disconnected: 'ApiOutlined',
    loading: 'LoadingOutlined',
    ready: 'CalculatorOutlined',
    error: 'WarningOutlined',
  } as const

  const casIcon = computed(() => statusIcons[casState.value])

  function setStatus(s: string) {
    casState.value = s
  }

  function setReady() {
    casState.value = 'ready'
  }
  function setLoading() {
    casState.value = 'loading'
  }
  function setDisconnected() {
    casState.value = 'disconnected'
  }
  function setError() {
    casState.value = 'error'
  }

  return {
    casState,
    casIcon,
    setStatus,
    setReady,
    setLoading,
    setDisconnected,
    setError,
  }
}

function useFileInterface() {
  function promptNewFile() {
    fileNewModal.value = true
  }
  function promptCloseFile() {
    fileConfirmClose.value = true
  }
  // TODO: Close Confirm
  function openFileSaveModal() {
    console.log('Saving: ', docManager.currentDocument.value)
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
    serializedDocument,
    fileNewModal,
    fileSaveModal,
    fileOpenModal,
    documentPrefsModal,
    fileConfirmClose,
    promptNewFile,
    promptCloseFile,
    openFileSaveModal,
    closeFileSaveModal,
    openFileOpenModal,
    confirmFileOpenModal,
    closeDocPrefsModal,
  }
}

const casStatus = useCasStatus()
const fileInterface = useFileInterface()

export { fileInterface, casStatus }
