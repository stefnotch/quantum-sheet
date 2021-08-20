import { readonly, shallowReactive, shallowRef, ref, Ref, watch, unref, toRefs } from 'vue'
import type { UseQuantumDocument } from './document'

const quantumDocument = shallowRef<UseQuantumDocument<any>>()
const hasUnsavedChanges = ref(false)

export function useDocumentManager() {
  function registerQuantumDocument(newQuantumDocument: UseQuantumDocument<any>) {
    // TODO: Verify document integrity
    quantumDocument.value = newQuantumDocument
  }
  function loadDocument(serializedData: string) {
    let documentObject = JSON.parse(serializedData)
    // TODO: Reset document/create new document
    quantumDocument.value?.deserializeDocument(documentObject)
  }
  function saveDocument() {
    let serializedData = JSON.stringify(quantumDocument.value?.serializeDocument())
    return serializedData
  }

  return {
    registerQuantumDocument,
    loadDocument,
    saveDocument,
    currentDocument: quantumDocument,
  }
}
