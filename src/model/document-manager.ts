import { readonly, shallowReactive, shallowRef, ref, Ref, watch } from 'vue'

const quantumDocument = ref()

export function useDocumentManager() {
  function registerQuantumDocument(newQuantumDocument: Ref<HTMLElement>) {
    // TODO: Verify document integrity
    console.log('registering', newQuantumDocument)
    quantumDocument.value = newQuantumDocument.value
    console.log('registering', quantumDocument)
  }
  function loadDocument(serializedData: string) {
    quantumDocument.value.deserialize(serializedData)
  }
  function saveDocument() {
    return quantumDocument.value.serialize()
  }

  return {
    registerQuantumDocument,
    loadDocument,
    saveDocument,
    currentDocument: quantumDocument.value,
  }
}
