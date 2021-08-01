import { readonly, shallowReactive, shallowRef, ref, Ref, watch, unref, toRefs } from 'vue'

const quantumDocument = ref()

export function useDocumentManager() {
  function registerQuantumDocumentEl(newQuantumDocument: Ref<HTMLElement>) {
    // TODO: Verify document integrity
    quantumDocument.value = newQuantumDocument.value
  }
  function loadDocument(serializedData: string) {
    let documentObject = JSON.parse(serializedData)
    quantumDocument.value.deserialize(documentObject)
  }
  function saveDocument() {
    let serializedData = JSON.stringify(quantumDocument.value.serialize())
    return serializedData
  }

  return {
    registerQuantumDocumentEl,
    loadDocument,
    saveDocument,
    currentDocument: quantumDocument,
    quantumDocument,
  }
}
