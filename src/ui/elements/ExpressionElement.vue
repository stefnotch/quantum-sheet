<template>
  <div class="mathfield" ref="mathfieldContainer" tabindex="0"></div>
  <!--If you need a second element, just create it next to the mathfield?-->
  <!--Though, you gotta figure out the whole listeners and attributes stuff-->
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, shallowRef } from 'vue'
import { ExpressionElement, ExpressionElementType, ElementType } from '../../model/document/elements/expression-element'
import 'mathlive/dist/mathlive-fonts.css'
import MathLive, { MathfieldElement } from 'mathlive'
import { ElementCommands } from './element-commands'
import { Vector2 } from '../../model/vectors'
import { parse, serialize } from '@cortex-js/compute-engine'
import { dictionary } from '../../model/mathjson-custom-dictionary'

export { ExpressionElementType }

function setMathfieldOptions(mathfield: MathfieldElement) {
  const keybindings = mathfield.getOption('keybindings').concat([
    {
      key: 'ctrl+[Period]',
      ifMode: 'math',
      command: ['insert', '\\xrightarrow{\\placeholder{}}'],
    },
  ])

  // https://cortexjs.io/mathlive/guides/shortcuts/
  const shortcuts = mathfield.getOption('inlineShortcuts')
  shortcuts['->'] = {
    mode: 'math',
    value: '\\xrightarrow{\\placeholder{}}',
  }
  shortcuts[':'] = {
    mode: 'math',
    value: '\\coloneq',
  }

  mathfield.setOptions({
    inlineShortcuts: shortcuts,
    keybindings: keybindings,
  })
}

export default defineComponent({
  props: {
    /**
     * Gets the associated document-element
     */
    modelGetter: {
      type: Function as PropType<() => ExpressionElement>,
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

    // Show expression when the document-expression changes
    watch([expressionElement.expression, mathfield], ([value, _]) => {
      const latex = serialize(value, {
        multiply: '\\cdot',
        invisibleMultiply: '\\cdot',
        invisiblePlus: '+',
        dictionary: dictionary,
        groupSeparator: '',
      })

      mathfield.value?.setValue(latex, {
        suppressChangeNotifications: true,
        mode: 'math', // TODO: Why is this needed for `\text{}` to work?
      })
    })

    /**
     * Evaluate the expression that the user has typed
     */
    function evaluateExpression() {
      const expression = parse(mathfield.value?.getValue?.('latex') ?? '', {
        dictionary: dictionary,
        promoteUnknownFunctions: /$^/,
      })

      console.log('Evaluating ', mathfield.value?.getValue?.('latex'), '(Mathjson form: ', expression, ')')
      // TODO: Verify that the expression has no issues
      // TODO: Regarding multi letter variables
      // - Add all known variables point to dictionary
      // - If it was none if them, interpret it as separate, 1 letter variables
      // TODO: What about multi letter functions?
      // TODO: Add user-defined stuff to dictionary

      expressionElement.inputExpression(expression)
    }

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
          onContentDidChange: (mathfield: MathLive.Mathfield) => {
            // TODO: If the expression is simple enough, we can optionally show a preview of the result
          },
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
              evaluateExpression()
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

        setMathfieldOptions(mathfield.value)

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
          padding: 0px; 
         }`
          mathfield.value.shadowRoot?.appendChild?.(MLfieldcontainerCustomStyle)

          // Make mathfield thinner
          const shorterMathfieldCustomStyle = document.createElement('style')
          shorterMathfieldCustomStyle.innerHTML = `.ML__fieldcontainer__field {
          padding: 0px !important; 
         }`
          mathfield.value.shadowRoot?.appendChild?.(shorterMathfieldCustomStyle)
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
<style>
/** To prevent flashing https://cortexjs.io/mathlive/guides/lifecycle/ */
math-field:not(:defined) {
  display: none;
}
</style>
