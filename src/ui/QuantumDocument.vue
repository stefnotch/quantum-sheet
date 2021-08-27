<template>
  <div
    class="quantum-document"
    :class="'theme-paper-' + document.options.paperStyle"
    ref="documentElement"
    tabindex="-1"
    :style="{
      '--grid-cell-size-x': `${document.options.gridCellSize.x}px`,
      '--grid-cell-size-y': `${document.options.gridCellSize.y}px`,
      'min-width': `${pages.width.value}mm`,
      'min-height': `calc(${pages.height.value}mm * ${pages.pageCount.value})`,
    }"
    @pointerdown="events.handlePointerEvent($event)"
    @contextmenu="
      (e) => {
        e.preventDefault()
        return false
      }
    "
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
      @input="events.handleInputEvent($event)"
      @keydown="events.handleKeyboardEvent($event)"
      @keyup="events.handleKeyboardEvent($event)"
      @copy="clipboard.copy"
      @cut="clipboard.cut"
      @paste="clipboard.paste"
      @focus="
        grid.showCrosshair.value = true;
      "
      @blur="grid.showCrosshair.value = false;"
    ></textarea>

    <div class="grid-crosshair" :style="grid.gridToStyle(grid.crosshairPosition.value)" v-show="grid.showCrosshair.value">+</div>
    <div v-for="page in pages.pageCount.value - 1" class="page-divider" :key="page" :style="{ top: `calc(${pages.height.value}mm * ${page})` }">
      <span class="page-number">{{ page }}</span>
      <span class="next-page-number">{{ page + 1 }}</span>
    </div>
    <!-- TODO: Investigate moving quantum-blocks into a component, preferably one that has a <slot> for the actual components -->
    <div
      class="quantum-block"
      v-for="element in document.elements"
      :key="element.id"
      :id="element.id"
      :style="grid.gridToStyle(element.position.value)"
      :class="{ selected: element.selected.value }"
      @pointerdown="() => {}"
    >
      <!-- TODO: Use v-if="element.selected.value" -->
      <div class="selection-region"></div>
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
  <!-- <a-button @click="pages.addPage()">+ Page</a-button> -->
</template>
<script lang="ts">
import { defineComponent, readonly, ref, Ref, nextTick, unref, watch } from 'vue'
import { useDocument, UseQuantumDocument, QuantumDocumentElementTypes } from '../model/document/document'
import ExpressionElement, { ExpressionElementType } from './elements/ExpressionElement.vue'
import ScopeElement, { ScopeElementType } from './elements/ScopeStartElement.vue'
import LatexElement, { LatexElementType } from './elements/LatexElement.vue'
import { useFocusedElementCommands, ElementCommands } from './elements/element-commands'
import { Vector2 } from '../model/vectors'
import { QuantumElement, JsonType } from '../model/document/document-element'
import { watchImmediate } from '../model/reactivity-utils'
import * as UI from './ui'
import * as Notification from './notification'
import interact from 'interactjs'
import Selecto from 'selecto'

function useClipboard<T extends QuantumDocumentElementTypes>(document: UseQuantumDocument<T>) {
  function cut(ev: ClipboardEvent) {
    console.log('cut happened', ev)
  }
  function copy(ev: ClipboardEvent) {
    console.log('copy happened', ev)
    if (!ev.clipboardData) {
      Notification.warn('Failed to copy', 'Event clipboardData was null')
      return
    }
    // Doesn't really work, since the 'selection' code doesn't select the underlying document elements
    const selectedElements = document.getSelection()
    const serializedElements = selectedElements.map((v) => document.elementTypes[v.typeName].serializeElement(v))

    ev.clipboardData.setData('text/plain', JSON.stringify(serializedElements))
    ev.preventDefault()
  }
  function paste(ev: ClipboardEvent) {
    console.log('paste happened', ev)
  }
  return {
    cut,
    copy,
    paste,
  }
}

function useGrid<T extends QuantumDocumentElementTypes>(document: UseQuantumDocument<T>, inputElement: Ref<HTMLElement | undefined>) {
  const crosshairPosition = ref<Vector2>(new Vector2(2, 10))
  const showCrosshair = ref(true)

  function gridToStyle(gridPosition: Vector2 | Ref<Vector2>) {
    let pos = unref(gridPosition)
    return {
      left: pos.x * document.options.gridCellSize.x + 'px',
      top: pos.y * document.options.gridCellSize.y + 'px',
    }
  }

  function pointerDown(ev: PointerEvent) {
    if (ev.target == ev.currentTarget) {
      crosshairPosition.value = new Vector2(
        Math.round(ev.offsetX / document.options.gridCellSize.x),
        Math.round(ev.offsetY / document.options.gridCellSize.y)
      )
      if (ev.button == 2) {
        // context menu
      }
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
    inputElement.value?.focus({ preventScroll: true })

    // Focus element under crosshair
    let blockToFocus = document.getElementAt(crosshairPosition.value)
    document.setFocus(blockToFocus)
  }

  return {
    crosshairPosition: readonly(crosshairPosition),
    showCrosshair,
    gridToStyle,
    pointerDown,
    keydown,
    keyup,

    moveCrosshairOut,
    focusUnderCrosshair,
  }
}

function useElementSelection<T extends QuantumDocumentElementTypes>(quantumDocument: UseQuantumDocument<T>) {
  nextTick(function () {
    const selecto = new Selecto({
      // The container to add a selection element
      container: document.querySelector('.quantum-document') as HTMLElement,
      // Selecto's root container (No transformed container. (default: null)
      // rootContainer: document.querySelector('.quantum-document'),
      // The area to drag selection element (default: container)
      // dragContainer: document.querySelector('.selection-region') as HTMLElement,
      // Targets to select. You can register a queryselector or an Element.
      selectableTargets: ['.selection-region'],
      // Whether to select by click (default: true)
      selectByClick: true,
      // Whether to select from the target inside (default: true)
      selectFromInside: false,
      // After the select, whether to select the next target with the selected target (deselected if the target is selected again).
      continueSelect: false,
      // Determines which key to continue selecting the next target via keydown and keyup.
      toggleContinueSelect: 'shift',
      // The container for keydown and keyup events
      // keyContainer: window,
      // The rate at which the target overlaps the drag area to be selected. (default: 100)
      hitRate: 100,
      preventDragFromInside: false,
      // preventDefault: true,
    })
    selecto
      .on('select', (e) => {
        // add to array
        e.added.forEach((el) => {
          if (el.className === 'selection-region') {
            // selection-region is the child element, we want the id of the parent, quantum-element
            el = el.parentElement as HTMLElement
          }
          quantumDocument.getElementById(el.id)?.setSelected(true)
        })
        e.removed.forEach((el) => {
          if (el.className === 'selection-region') {
            // selection-region is the child element, we want the id of the parent, quantum-element
            el = el.parentElement as HTMLElement
          }
          quantumDocument.getElementById(el.id)?.setSelected(false)
        })
      })
      .on('dragStart', (e) => {
        const target = e.inputEvent.target
        if (selecto.getSelectedTargets().includes(target)) {
          e.stop()
        }
      })
  })

  return {}
}

function useElementDrag<T extends QuantumDocumentElementTypes>(quantumDocument: UseQuantumDocument<T>, pages: ReturnType<typeof usePages>) {
  // TODO: Investigate or try out Moveable.js
  // I got stuff to break by adding a few blocks, moving them around and stuff
  // Tell interactjs to make every .quantum-block interactive. This includes the ones that will get added in the future
  let previousScrollTop = 0
  let previousScrollLeft = 0
  let dragging = false

  nextTick(function () {
    interact('.quantum-block')
      .draggable({
        ignoreFrom: '.quantum-element',
        modifiers: [
          interact.modifiers.snap({
            targets: [interact.snappers.grid({ x: quantumDocument.options.gridCellSize.x, y: quantumDocument.options.gridCellSize.y })],
            range: Infinity,
            relativePoints: [{ x: 0, y: 0 }],
            offset: 'parent',
            // endOnly: true,
          }),
          interact.modifiers.restrict({
            restriction: '.quantum-document',
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
            // endOnly: true,
          }),
        ],
        inertia: false,
        autoScroll: {
          container: document.querySelector('.content') as HTMLElement,
          margin: 50,
          distance: 5,
          interval: 10,
          speed: 500,
        },
      })
      .on('down', (event) => {
        dragging = true
      })
      .on('dragmove', (event) => {
        let delta = new Vector2(event.dx / quantumDocument.options.gridCellSize.x, event.dy / quantumDocument.options.gridCellSize.y)
        quantumDocument.moveSelectedElements(delta)
        event.preventDefault()
      })
      .on('dragend', (event) => {
        pages.updatePageCount()
        dragging = false
      })

    document.querySelector('.content')?.addEventListener('scroll', function (e) {
      if (e.target && dragging) {
        let scrollLeft = e.target.scrollLeft != 0 ? e.target.scrollLeft / quantumDocument.options.gridCellSize.x : 0
        let scrollTop = e.target.scrollTop != 0 ? e.target.scrollTop / quantumDocument.options.gridCellSize.y : 0
        let delta = new Vector2(scrollLeft - previousScrollLeft, scrollTop - previousScrollTop)
        quantumDocument.moveSelectedElements(delta)

        previousScrollTop = scrollTop
        previousScrollLeft = scrollLeft
      }
    })
  })

  return {}
}

function useEvents<T extends QuantumDocumentElementTypes>(
  quantumDocument: UseQuantumDocument<T>,
  focusedElementCommands: Ref<ElementCommands | undefined>,
  grid: ReturnType<typeof useGrid>
) {
  function createElementAtEvent(ev: InputEvent) {
    let elementType: string = ExpressionElementType.typeName
    if (ev.data === '@') {
      // TODO: Temporary hack
      const type = prompt('Which element type?')
      if (type?.toLowerCase() === 'latex') {
        elementType = LatexElementType.typeName
      } else {
        console.warn('Unknown type ' + type)
      }
    }
    let element = quantumDocument.createElement(elementType, {
      position: grid.crosshairPosition.value,
      resizable: false,
    })
    quantumDocument.setFocus(element)
    nextTick(() => {
      focusedElementCommands.value?.moveToStart?.()
      focusedElementCommands.value?.insert?.(ev.data + '')
    })
  }

  function handleEvent(event: object) {
    if (event instanceof InputEvent) {
      handleInputEvent(event)
    } else if (event instanceof KeyboardEvent) {
      handleKeyboardEvent(event)
    } else if (event instanceof PointerEvent) {
      handlePointerEvent(event)
    }
  }

  function handleInputEvent(event: InputEvent) {
    // If already inputting in TextArea
    if (event.isComposing) return

    const text = event.data
    if (event.currentTarget) {
      ;(event.currentTarget as HTMLTextAreaElement).value = ''
    }
    if (!text) return

    // else
    createElementAtEvent(event)
  }

  function handleKeyboardEvent(event: KeyboardEvent) {
    if (event.type === 'keydown') {
      // console.log(event)
      if (event.key === 'Delete') {
        quantumDocument.getSelection().forEach((Element: QuantumElement) => {
          quantumDocument.deleteElement(Element)
        })
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        if (quantumDocument.getSelection().length > 0) {
          let direction =
            {
              ArrowLeft: new Vector2(-1, 0),
              ArrowRight: new Vector2(1, 0),
              ArrowUp: new Vector2(0, -1),
              ArrowDown: new Vector2(0, 1),
            }[event.key] ?? Vector2.zero
          quantumDocument.moveSelectedElements(direction)
        } else {
          grid.keydown(event)
        }
      } else if (event.code === 'KeyZ' && event.ctrlKey) {
        Notification.warn('Unsupported Action', 'Undo/Redo unsupported at the moment')
      } else {
        // Nothing, pass along to potential InputEvents
      }
    } else if (event.type === 'keyup') {
      grid.keyup(event)
    }
  }

  function handlePointerEvent(event: PointerEvent) {
    grid.pointerDown(event)
  }

  return {
    handleEvent,
    handleInputEvent,
    handleKeyboardEvent,
    handlePointerEvent,
  }
}

function usePages<T extends QuantumDocumentElementTypes>(quantumDocument: UseQuantumDocument<T>) {
  const pageCount = ref(1)
  const defaultSheetSize = 'A4'
  const sheetSizes = {
    A3: { width: 297, height: 420 },
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    ANSI_A: { width: 216, height: 279 },
    ANSI_B: { width: 279, height: 432 },
    ARCH_A: { width: 229, height: 305 },
    ARCH_B: { width: 305, height: 457 },
    // Legal: { width: 216, height: 356 },
  } as const

  const width = ref(0)
  const height = ref(0)

  function getPageNumberOfPosition(y: number) {
    // (1in = 96px = 2.54cm = 25.4mm)
    const paperSize = quantumDocument.options.paperSize in sheetSizes ? quantumDocument.options.paperSize : defaultSheetSize
    const yPos = (y * quantumDocument.options.gridCellSize.y * (25.4 / 96)) / sheetSizes[paperSize].height
    return yPos
  }

  function lowestElementPosition(arr: readonly QuantumElement[]) {
    // At the very least, we have to be at the top (y: 0)
    let largest = 0
    for (var i = 0; i < arr.length; i++) {
      const number = +arr[i].position.value.y
      // Compares stored largest number with current number, stores the largest one
      largest = Math.max(largest, number)
    }

    return largest
  }

  function updatePageCount() {
    const maxElPos = getPageNumberOfPosition(lowestElementPosition(quantumDocument.elements))
    pageCount.value = Math.ceil(maxElPos + 0.1)
    if (pageCount.value < 1 || Number.isNaN(pageCount.value)) {
      pageCount.value = 1
    }
  }

  function addPage() {
    pageCount.value += 1
  }

  // Element Added/Removed
  watch(quantumDocument.elements, (value) => {
    updatePageCount()
  })

  watchImmediate(
    () => quantumDocument.options.paperSize,
    (value) => {
      if (!(value in sheetSizes)) value = defaultSheetSize
      width.value = sheetSizes[value].width
      height.value = sheetSizes[value].height
    }
  )

  return {
    pageCount,
    updatePageCount,
    addPage,
    width,
    height,
  }
}

/**
 * To say which document-element type corresponds to which Vue.js component
 */
type TypeComponents<T extends UseQuantumDocument<any>> = T extends UseQuantumDocument<infer U> ? { [key in keyof U]: any } : any

export default defineComponent({
  components: {
    ExpressionElement,
    ScopeElement,
    LatexElement,
  },
  emits: {
    'quantum-document': (value: UseQuantumDocument<any>) => true,
  },
  setup(props, context) {
    const document = useDocument({
      [ExpressionElementType.typeName]: ExpressionElementType,
      [ScopeElementType.typeName]: ScopeElementType,
      [LatexElementType.typeName]: LatexElementType,
    })

    // let z = new document.elementTypes['scope-element'].elementType({})

    const typeComponents: TypeComponents<typeof document> = {
      [ExpressionElementType.typeName]: ExpressionElement,
      [ScopeElementType.typeName]: ScopeElement,
      [LatexElementType.typeName]: LatexElement,
    }

    const documentElement = ref<HTMLElement>()
    const documentInputElement = ref<HTMLElement>()

    // const UI = useUI()
    const focusedElementCommands = useFocusedElementCommands()
    const grid = useGrid(document, documentInputElement)
    const pages = usePages(document)
    const clipboard = useClipboard(document)
    const selection = useElementSelection(document)
    const elementDrag = useElementDrag(document, pages)
    const events = useEvents(document, focusedElementCommands.commands, grid)

    function log(ev: any) {
      console.log(ev)
    }

    function getTypeComponent(typeName: string) {
      return (typeComponents as any)[typeName]
    }

    context.emit('quantum-document', document)

    return {
      document,
      documentElement,
      documentInputElement,

      focusedElementCommands,
      grid,
      pages,
      clipboard,
      selection,
      events,
      UI,

      getTypeComponent,
      log,
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
.theme-paper-printer {
  /* Printer Papaer Style */
  --color: white;
  --grid-color: white;
}
.quantum-document {
  background-color: var(--color);
  --selected-background-color: rgba(68, 148, 202, 0.24);
  --selected-color: rgba(57, 131, 180, 0.459);

  background-size: var(--grid-cell-size-x) var(--grid-cell-size-y), var(--grid-cell-size-x) var(--grid-cell-size-y),
    calc(var(--grid-cell-size-x) * 5) calc(var(--grid-cell-size-y) * 5), calc(var(--grid-cell-size-x) * 5) calc(var(--grid-cell-size-y) * 5);
  background-image: linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px), linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);

  position: relative;
  /* touch-action: none; */

  /* width: 100%;
  min-height: 100%; */
}

.quantum-block {
  position: absolute;
  min-width: 50px;
  min-height: 1px;
  padding: 0px 4px;
  outline-offset: -1px;
}

.quantum-block:hover {
  outline: 1px solid var(--selected-color);
}
/* .quantum-block.dragging {
  outline: 1px solid var(--selected-color);
} */
.quantum-block:focus-within {
  outline: 1px dashed var(--selected-color);
}
.quantum-block.selected {
  outline: 1px solid var(--selected-color);
  background: var(--selected-background-color);
}

.quantum-document .input-element {
  transform: scale(0);
  resize: none;
  position: fixed;
  clip: rect(0 0 0 0);
  width: 0px;
  height: 0px;
}
.selection-region {
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: -4px;
  right: -4px;
}
.quantum-block:focus-within .selection-region,
.quantum-block.selected .selection-region {
  top: -10px;
  bottom: -10px;
  left: -10px;
  right: -10px;
}

.grid-crosshair {
  position: absolute;
  user-select: none;
  transform: translate(-50%, -50%);
  padding: 1px;
  font-family: Arial, Helvetica, sans-serif;
}

.page-divider {
  position: absolute;
  top: 21cm;
  width: 100%;
  height: 1px;
  border-style: dashed;
  border-color: rgb(173, 173, 173);
  border-width: 0.5px;
}

.page-number,
.next-page-number {
  position: absolute;
  right: -10px;
  transform: translateX(100%);
  color: rgb(90, 110, 129);
  user-select: none;
}

.page-number {
  bottom: 4px;
}

.next-page-number {
  top: 4px;
}
</style>
