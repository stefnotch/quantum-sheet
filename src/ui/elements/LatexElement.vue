<template>
  <div class="mathfield" ref="mathfieldContainer" tabindex="0"></div>
  <!--If you need a second element, just create it next to the mathfield?-->
  <!--Though, you gotta figure out the whole listeners and attributes stuff-->
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, shallowRef } from 'vue'
import { LatexElement, LatexElementType, ElementType } from '../../model/document/elements/latex-element'
import 'mathlive/dist/mathlive-fonts.css'
import MathLive, { MathfieldElement } from 'mathlive'
import { ElementCommands } from './element-commands'
import { Vector2 } from '../../model/vectors'

export { LatexElementType }

// TODO: Reduce code duplication with ExpressionElement.vue
export default defineComponent({
  props: {
    /**
     * Gets the associated document-element
     */
    modelGetter: {
      type: Function as PropType<() => LatexElement>,
      required: true,
    },
  },
  emits: {
    'focused-element-commands': (value: ElementCommands | undefined) => true,
    'move-cursor-out': (direction: Vector2) => true, // TODO: Mathlive supports getting the screen position of the cursor. Use that!
    'delete-element': () => true,
  },
  setup(props, context) {
    const mathfieldContainer = ref<HTMLElement>()
    const mathfield = shallowRef<MathfieldElement>()
    const expressionElement = props.modelGetter()

    // Change mathfield focus
    watch(expressionElement.focused, (value) => {
      if (value) {
        // Don't focus the mathfield if it already has focus
        if (mathfield.value?.hasFocus() !== true) mathfield.value?.focus?.()
      } else {
        mathfield.value?.blur?.()
      }
    })

    // Show expression when the document-latex changes
    watch([expressionElement.latex, mathfield], ([value, _]) => {
      mathfield.value?.setValue(value, {
        suppressChangeNotifications: true,
        mode: 'math', // TODO: Why is this needed for `\text{}` to work?
      })
    })

    // Create the mathfield
    watch(
      mathfieldContainer,
      (value) => {
        if (!value) return

        mathfield.value = new MathfieldElement({
          defaultMode: 'math',
          smartSuperscript: false,
          removeExtraneousParentheses: true,
          smartFence: true,
          plonkSound: null,
          keypressSound: null,
          onFocus: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(true)
            context.emit('focused-element-commands', {
              elementType: ElementType,
              moveToStart: () => mathfield.executeCommand('moveToMathFieldStart'),
              moveToEnd: () => mathfield.executeCommand('moveToMathFieldEnd'),
              insert: (text: string) => {
                if (text.startsWith('\\')) {
                  mathfield.insert(text, { mode: 'latex' })
                } else {
                  mathfield.insert(text)
                }
              },
            })
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            context.emit('focused-element-commands', undefined)
            expressionElement.setFocused(false)

            if (mathfield.getValue('latex').length == 0) {
              context.emit('delete-element')
            } else {
              expressionElement.latex.value = mathfield.getValue('latex')
            }
          },
          onMoveOutOf: (mathfield: MathLive.Mathfield, direction) => {
            let directionVector =
              {
                forward: new Vector2(1, 0),
                backward: new Vector2(-1, 0),
                upward: new Vector2(0, -1),
                downward: new Vector2(0, 1),
              }[direction] ?? Vector2.zero

            context.emit('move-cursor-out', directionVector)
            return false
          },
          onTabOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit('move-cursor-out', new Vector2(direction == 'forward' ? 1 : -1, 0))
            return true
          },
          onCommit: (mathfield) => {
            mathfield.blur?.()
            context.emit('move-cursor-out', new Vector2(0, 1))
          },
        })

        mathfield.value.style.fontSize = '18px'

        // TODO: Remove this hack once this gets fixed https://github.com/arnog/mathlive/issues/1056
        {
          const caretCustomStyle = document.createElement('style')
          caretCustomStyle.innerHTML = `.ML__caret:after {
          border-right-width: 0px !important;
          margin-right: 0px !important;
          width: 0px !important;
          box-shadow: 0px 0px 0px 1px var(--caret,hsl(var(--hue,212),40%,49%));
         }`
          mathfield.value.shadowRoot?.appendChild?.(caretCustomStyle)

          // make single-line block not so tall
          const MLfieldcontainerCustomStyle = document.createElement('style')
          MLfieldcontainerCustomStyle.innerHTML = `.ML__fieldcontainer {
          min-height: 12px  !important;
         }
         .ML__fieldcontainer__field {
          min-height: 12px  !important;
         }`
          mathfield.value.shadowRoot?.appendChild?.(MLfieldcontainerCustomStyle)
        }

        value.innerHTML = ''
        value.appendChild(mathfield.value)

        if (expressionElement.focused.value) {
          mathfield.value.focus()
        }
      },
      {
        // This is here because we're accessing `mathfieldContainer`
        // Not sure if this is necessary
        // https://v3.vuejs.org/guide/reactivity-computed-watchers.html#effect-flush-timing
        flush: 'post',
      }
    )

    return {
      mathfieldContainer,
    }
  },
})
</script>
