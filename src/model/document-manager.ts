import { readonly, shallowReactive, shallowRef, ref, Ref, watch, unref, toRefs } from 'vue'

const quantumDocument = ref()

// function useDocumentPreferences() {
//   type PaperStyleType = Ref<'standard' | 'engineering'>
//   const paperStyle: PaperStyleType = ref('standard')
//   // TODO: Default Result Notation Style - Decimal (# Digits), Scientific, Fraction, other?
//   // TODO: Result Text Style? - Text, LaTeX
//   // TODO: Default Units
//   return {
//     paperStyle,
//   }
// }

export function useDocumentManager() {
  // const prefs = useDocumentPreferences()
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
    // prefs,
    registerQuantumDocumentEl,
    loadDocument,
    saveDocument,
    // currentDocument: toRefs(quantumDocument.value),
    quantumDocument,
  }
}
