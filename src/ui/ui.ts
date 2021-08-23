import { readonly, shallowReactive, shallowRef, ref, watch, Ref, inject, defineComponent, computed } from 'vue'
import { useDocumentManager } from '../model/document/document-manager'
import { notification } from 'ant-design-vue'

const casState = ref('disconnected')

const docManager = useDocumentManager()

function useUIPreferences() {
  // TODO: Theme - Light, Dark, Custom?
  // TODO: Zoom
  // TODO: Page Numbers?
}

function useCASStatus(CASStatus: Ref<string>) {
  const statusIcons = {
    disconnected: 'ApiOutlined',
    loading: 'LoadingOutlined',
    ready: 'CalculatorOutlined',
    error: 'WarningOutlined',
  }

  const icon = computed(() => statusIcons[casState.value])

  function setStatus(s: string) {
    casState.value = s
  }

  function setReady() {
    casState.value = 'ready'
    console.log('ready', casState, casState.value)
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
    icon,
    setStatus,
    setReady,
    setLoading,
    setDisconnected,
    setError,
  }
}

export function useUI() {
  const fileNewModal: Ref<boolean> = ref(false)
  const fileSaveModal: Ref<boolean> = ref(false)
  const fileOpenModal: Ref<boolean> = ref(false)
  const documentPrefsModal: Ref<boolean> = ref(false)

  const fileConfirmClose: Ref<boolean> = ref(false)
  const serializedDocument: Ref<string> = ref('')
  // TODO: UI Preferences
  const CASStatus = useCASStatus(casState)

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

  function notify(type: string, message: string, details: any) {
    let description = typeof details !== 'string' ? JSON.stringify(details) : details
    const config = {
      message,
      description,
    }
    notification[type](config)
  }

  function log(message: string, details: any) {
    let description = typeof details !== 'string' ? JSON.stringify(details) : details
    const config = {
      message,
      description,
    }
    notification.info(config)
  }

  function warn(message: string, details: any) {
    let description = typeof details !== 'string' ? JSON.stringify(details) : details
    const config = {
      message,
      description,
    }
    notification.warn(config)
  }

  function error(message: string, details: any) {
    let description = typeof details !== 'string' ? JSON.stringify(details) : details
    const config = {
      message,
      description,
    }
    notification.error(config)
  }

  return {
    CASStatus,

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

    notify,
    log,
    warn,
    error,

    serializedDocument,
  }
}
