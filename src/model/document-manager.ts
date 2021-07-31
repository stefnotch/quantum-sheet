import { readonly, shallowReactive, shallowRef, ref, Ref, watch, unref, toRefs } from 'vue'

const quantumDocument = ref()

export function useDocumentManager() {
  function registerQuantumDocumentEl(newQuantumDocument: Ref<HTMLElement>) {
    // TODO: Verify document integrity
    quantumDocument.value = newQuantumDocument.value
  }
  function loadDocument(serializedData: string) {
    quantumDocument.value.deserialize(serializedData)
  }
  function saveDocument() {
    return quantumDocument.value.serialize()
  }

  return {
    registerQuantumDocumentEl,
    loadDocument,
    saveDocument,
    currentDocument: quantumDocument,
    quantumDocument,
  }
}
