<template>
  <div
    class="quantum-document"
    :class="'theme-paper-' + docPrefs.paperStyle.value"
    ref="documentElement"
    tabindex="-1"
    :style="{
      '--grid-cell-size-x': `${document.gridCellSize.x}px`,
      '--grid-cell-size-y': `${document.gridCellSize.y}px`,
    }"
    @pointerdown="grid.pointerDown($event)"
    @contextmenu="
      (e) => {
        e.preventDefault()
        return false
      }
    "
    @paste="clipboard.paste"
    @focus="documentInputElement.focus({ preventScroll: true })"
  >
    <!-- prettier-ignore -->
    <textarea
      class="input-element"
      ref="documentInputElement"
      autofocus
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @input="grid.textInput($event)"
      @keydown="grid.keydown($event)"
      @keyup="grid.keyup($event)"
      @focus="
        document.setSelection();
        grid.showCrosshair.value = true;
      "
      @blur="grid.showCrosshair.value = false"
    ></textarea>

    <div class="grid-crosshair" :style="grid.gridToStyle(grid.crosshairPosition.value)" v-show="grid.showCrosshair.value">+</div>
    <div
      class="quantum-block"
      v-for="element in document.elements"
      :key="element.id"
      :id="element.id"
      :style="grid.gridToStyle(element.position.value)"
      :class="{ selected: element.selected.value }"
      @pointerdown="() => {}"
    >
      <component
        :is="getTypeComponent(element.typeName)"
        class="quantum-element"
        :modelGetter="() => element"
        @focused-element-commands="(value) => (focusedElementCommands.commands.value = value)"
        @move-cursor-out="(value) => grid.moveCrosshairOut(element, value)"
        @delete-element="document.deleteElement(element)"
      ></component>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, readonly, ref, Ref, nextTick, unref, onMounted, inject, provide } from 'vue'
import { useDocument, UseQuantumDocument, QuantumDocumentElementTypes } from '../model/document/document'
import ExpressionElement, { ExpressionElementType } from './elements/ExpressionElement.vue'
import ScopeElement, { ScopeElementType } from './elements/ScopeStartElement.vue'
import { useFocusedElementCommands, ElementCommands } from './elements/element-commands'
import { Vector2 } from '../model/vectors'
import { QuantumElement } from '../model/document/document-element'
import { useUI } from './ui'
import interact from 'interactjs'

function useClipboard<T extends QuantumDocumentElementTypes>(document: UseQuantumDocument<T>) {
  function cut(ev: ClipboardEvent) {}
  function copy(ev: ClipboardEvent) {}
  function paste(ev: ClipboardEvent) {}
  return {
    cut,
    copy,
    paste,
  }
}

function useGrid<T extends QuantumDocumentElementTypes>(
  document: UseQuantumDocument<T>,
  inputElement: Ref<HTMLElement | undefined>,
  focusedElementCommands: Ref<ElementCommands | undefined>
) {
  const crosshairPosition = ref<Vector2>(new Vector2(2, 10))
  const showCrosshair = ref(true)

  function gridToStyle(gridPosition: Vector2 | Ref<Vector2>) {
    let pos = unref(gridPosition)
    return {
      left: pos.x * document.gridCellSize.x + 'px',
      top: pos.y * document.gridCellSize.y + 'px',
    }
  }

  function pointerDown(ev: PointerEvent) {
    // console.log('pointerdown', ev)
    if (ev.target == ev.currentTarget) {
      crosshairPosition.value = new Vector2(Math.round(ev.offsetX / document.gridCellSize.x), Math.round(ev.offsetY / document.gridCellSize.y))
      if (ev.button == 2) {
        // context menu
      }
    }
  }

  function textInput(ev: InputEvent) {
    if (ev.isComposing) return

    if (ev.data) {
      let element = document.createElement(ExpressionElementType.typeName, {
        position: crosshairPosition.value,
        resizable: false,
      })
      document.setFocus(element)
      nextTick(() => {
        focusedElementCommands.value?.moveToStart?.()
        focusedElementCommands.value?.insert?.(ev.data + '')
      })
    }

    if (ev.currentTarget) {
      ;(ev.currentTarget as HTMLTextAreaElement).value = ''
    }
  }

  function keydown(ev: KeyboardEvent) {
    if (ev.isComposing) return

    let direction =
      {
        ArrowLeft: new Vector2(-1, 0),
        ArrowRight: new Vector2(1, 0),
        ArrowUp: new Vector2(0, -1),
        ArrowDown: new Vector2(0, 1),
      }[ev.key] ?? Vector2.zero

    crosshairPosition.value = crosshairPosition.value.add(direction)
    focusUnderCrosshair()
  }

  function keyup(ev: KeyboardEvent) {
    if (ev.isComposing) return
  }

  function moveCrosshairOut(element: QuantumElement, direction: Vector2) {
    let pos = element.position.value.add(new Vector2(direction.x > 0 ? element.size.value.x : 0, direction.y > 0 ? element.size.value.y : 0))

    crosshairPosition.value = pos.add(direction)
    focusUnderCrosshair()
  }

  function focusUnderCrosshair() {
    // Focus crosshair
    inputElement.value?.focus()

    // Focus element under crosshair
    let blockToFocus = document.getElementAt(crosshairPosition.value)
    document.setFocus(blockToFocus)
  }

  return {
    crosshairPosition: readonly(crosshairPosition),
    showCrosshair,
    gridToStyle,
    pointerDown,
    textInput,
    keydown,
    keyup,

    moveCrosshairOut,
    focusUnderCrosshair,
  }
}

function useDocumentPreferences() {
  type PaperStyleType = Ref<'standard' | 'engineering'>
  const paperStyle: PaperStyleType = ref('standard')
  // TODO: Default Result Notation Style - Decimal (# Digits), Scientific, Fraction, other?
  // TODO: Result Text Style? - Text, LaTeX
  // TODO: Default Units

  function loadFromFile(documentFile: any) {
    paperStyle.value = documentFile?.preferences.paperStyle
  }
  function saveToFile(documentFile: any) {
    // documentFile.preferences.paperStyle = paperStyle.value
    Object.assign(documentFile, { preferences: { paperStyle: paperStyle.value } })
    return documentFile
  }
  return {
    paperStyle,
    loadFromFile,
    saveToFile,
  }
}

type JsonType = undefined | null | boolean | number | string | JsonType[] | { [prop: string]: JsonType }

function useElementDrag<T extends QuantumDocumentElementTypes>(quantumDocument: UseQuantumDocument<T>) {
  // TODO: Investigate
  // I got stuff to break by adding a few blocks, moving them around and stuff
  // Tell interactjs to make every .quantum-block interactive. This includes the ones that will get added in the future
  interact('.quantum-block')
    .draggable({
      ignoreFrom: '.quantum-element',
      modifiers: [
        interact.modifiers.snap({
          targets: [interact.snappers.grid({ x: quantumDocument.gridCellSize.x, y: quantumDocument.gridCellSize.y })],
          range: Infinity,
          relativePoints: [{ x: 0, y: 0 }],
        }),
        interact.modifiers.restrict({
          restriction: '.quantum-document',
          elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
          endOnly: true,
        }),
      ],
      inertia: false,
    })
    .on('down', (event) => {
      event.target?.classList.add('dragging')
    })
    .on('dragmove', (event) => {
      const quantumElement = quantumDocument.getElementById(event.target.id)
      let delta = new Vector2(event.dx / quantumDocument.gridCellSize.x, event.dy / quantumDocument.gridCellSize.y)
      let newPos = quantumElement?.position.value.add(delta)
      if (newPos) quantumElement?.setPosition(newPos)
    })
    .on('dragend', (event) => {
      event.target?.classList.remove('dragging')
    })
}

/**
 * To say with document-element type corresponds to which Vue.js component
 */
type TypeComponents<T extends UseQuantumDocument<any>> = T extends UseQuantumDocument<infer U> ? { [key in keyof U]: any } : any

export default defineComponent({
  components: {
    ExpressionElement,
    ScopeElement,
  },
  setup() {
    const docPrefs = useDocumentPreferences()

    const document = useDocument({ [ExpressionElementType.typeName]: ExpressionElementType, [ScopeElementType.typeName]: ScopeElementType })

    // let z = new document.elementTypes['scope-element'].elementType({})

    const typeComponents: TypeComponents<typeof document> = {
      [ExpressionElementType.typeName]: ExpressionElement,
      [ScopeElementType.typeName]: ScopeElement,
    }

    const documentElement = ref<HTMLElement>()
    const documentInputElement = ref<HTMLElement>()

    const focusedElementCommands = useFocusedElementCommands()
    const grid = useGrid(document, documentInputElement, focusedElementCommands.commands)
    const clipboard = useClipboard(document)
    const elementDrag = useElementDrag(document)

    function log(ev: any) {
      console.log(ev)
    }

    function getTypeComponent(typeName: string) {
      return (typeComponents as any)[typeName]
    }

    function serialize() {
      let serializedData = document.serializeDocument()
      serializedData = docPrefs.saveToFile(serializedData)
      // return JSON.stringify(serializedData)
      return serializedData
    }

    function deserialize(documentObject: JsonType) {
      // convert from string here : JSON.parse()
      // let documentObject = JSON.parse(serializedDocument)
      docPrefs.loadFromFile(documentObject)
      document.deserializeDocument(documentObject)
    }

    return {
      document,
      documentElement,
      documentInputElement,

      focusedElementCommands,
      grid,
      clipboard,
      getTypeComponent,
      log,

      serialize,
      deserialize,

      docPrefs,
    }
  },
})
</script>

<style scoped>
/*TODO: Use this https://github.com/vuejs/rfcs/blob/master/active-rfcs/0043-sfc-style-variables.md for the grid size and stuff? */
.theme-paper-standard {
  /* Standard Grid Papaer Style */
  --color: white;
  --grid-color: rgba(71, 162, 223, 0.26);
}
.theme-paper-engineer {
  /* Engineering Paper Style */
  --color: #fffdf8;
  --grid-color: #c5dec467;
}
.quantum-document {
  background-color: var(--color);
  --selected-background-color: rgba(68, 148, 202, 0.24);
  --selected-color: rgba(57, 131, 180, 0.459);
  background-size: var(--grid-cell-size-x) var(--grid-cell-size-y);
  background-image: linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  position: relative;
  /* touch-action: none; */

  width: 100%;
  min-height: 100%;
}

.quantum-block {
  position: absolute;
  min-width: 50px;
  padding: 4px;
  margin: 1px;
}

.quantum-block:hover {
  border: 1px solid var(--selected-color);
  margin: 0px;
}
.quantum-block.dragging {
  border: 1px solid var(--selected-color);
  margin: 0px;
}
.quantum-block:focus-within {
  border: 1px dashed var(--selected-color);
  margin: 0px;
}
.quantum-block.selected {
  border: 1px solid var(--selected-color);
  margin: 0px;
  background: var(--selected-background-color);
}

.quantum-document .input-element {
  transform: scale(0);
  resize: none;
  position: absolute;
  clip: rect(0 0 0 0);
  width: 0px;
  height: 0px;
}

.grid-crosshair {
  position: absolute;
  user-select: none;
  transform: translate(-50%, -50%);
  padding: 1px;
  font-family: Arial, Helvetica, sans-serif;
}
</style>
