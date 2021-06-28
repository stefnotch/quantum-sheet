<template>
  <div class="mathfield" ref="mathfieldContainer" tabindex="0"></div>
  <!--If you need a second element, just create it next to the mathfield?-->
  <!--Though, you gotta figure out the whole listeners and attributes stuff-->
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, shallowRef } from "vue";
import {
  UseExpressionElement,
  ExpressionElementType,
  ElementType,
} from "../../model/document/elements/expression-element";
import "mathlive/dist/mathlive-fonts.css";
import MathLive, { MathfieldElement } from "mathlive";
import { ElementCommands } from "./element-commands";
import { Vector2 } from "../../model/vectors";
import { parse, serialize } from "@cortex-js/compute-engine";
import { dictionary } from "../../model/mathlive-custom-dictionary";

export { ExpressionElementType };

export default defineComponent({
  props: {
    /**
     * Gets the associated document-element
     */
    modelGetter: {
      type: Function as PropType<() => UseExpressionElement>,
      required: true,
    },
  },
  emits: {
    "focused-element-commands": (value: ElementCommands | undefined) => true,
    "move-cursor-out": (direction: Vector2) => true,
    "delete-element": () => true,
  },
  setup(props, context) {
    const mathfieldContainer = ref<HTMLElement>();
    const mathfield = shallowRef<MathfieldElement>();
    const expressionElement = props.modelGetter();

    watch(expressionElement.expression, (value) => {
      const latex = serialize(value, {
        multiply: "\\cdot",
        invisibleMultiply: "\\cdot",
        dictionary: dictionary,
      });
      mathfield.value?.setValue(latex, {
        suppressChangeNotifications: true,
        mode: "math",
        format: "latex",
      });
    });

    watch(expressionElement.focused, (value) =>
      value ? mathfield.value?.focus?.() : mathfield.value?.blur?.()
    );

    function evaluateExpression() {
      const expression = parse(mathfield.value?.getValue?.("latex") ?? "", {
        dictionary: dictionary,
      });
      /*        {
          form: ["full"], // TODO: Mathjson can have objects like {num:"3"} instead of 3
          // @ts-ignore
          /*promoteUnknownSymbols: {
            test: (value) => {
              console.log(value);
              return false;
            },
          },/
          //promoteUnknownSymbols: /^[a-zA-Z]([a-zA-Z]|$)/,
          //promoteUnknownFunctions: /^[fge][fg]$/,
          //dictionary: // TODO:
          //onError,
        }
      );*/
      console.log(
        "Parsing",
        mathfield.value?.getValue?.("latex"),
        "resulted in",
        expression
      );
      // TODO: Verify that the expression has no issues
      // TODO: Regarding multi letter variables
      // - Add all known variables point to dictionary
      // - If it was none if them, interpret it as separate, 1 letter variables
      // TODO: What about multi letter functions?

      expressionElement.inputExpression(expression);
    }

    // TODO: Maintain your own list of shortcuts (because the default ones cause some issues)
    watch(
      mathfieldContainer,
      (value) => {
        if (!value) return;
        mathfield.value = new MathfieldElement({
          defaultMode: "math",
          // smartSuperscript: true,
          removeExtraneousParentheses: true,
          smartFence: true,
          plonkSound: null,
          keypressSound: null,
          onContentDidChange: (mathfield: MathLive.Mathfield) => {
            console.log("content changed", mathfield.getValue("latex"));
            // TODO: Don't try to compute anything while I'm editing the mathfield
          },
          onFocus: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(true);
            context.emit("focused-element-commands", {
              elementType: ElementType,
              moveToStart: () =>
                mathfield.executeCommand("moveToMathFieldStart"),
              moveToEnd: () => mathfield.executeCommand("moveToMathFieldEnd"),
              insert: (text: string) => {
                if (text.startsWith("\\")) {
                  mathfield.insert(text, { mode: "latex" });
                } else {
                  mathfield.insert(text);
                }
              },
            });
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(false);
            context.emit("focused-element-commands", undefined);

            if (mathfield.getValue("latex").length == 0) {
              context.emit("delete-element");
            } else {
              console.log("onBlur");
              evaluateExpression();
            }
          },
          onMoveOutOf: (mathfield: MathLive.Mathfield, direction) => {
            let directionVector = Vector2.zero;
            if (direction == "forward") {
              directionVector = new Vector2(1, 0);
            } else if (direction == "backward") {
              directionVector = new Vector2(-1, 0);
            } else if (direction == "upward") {
              directionVector = new Vector2(0, -1);
            } else if (direction == "downward") {
              directionVector = new Vector2(0, 1);
            }
            context.emit("move-cursor-out", directionVector);
            return false;
          },
          onTabOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit(
              "move-cursor-out",
              new Vector2(direction == "forward" ? 1 : -1, 0)
            );
            return true;
          },
          onKeystroke: (mathfield, keystroke, ev) => {
            //@ts-ignore
            // TODO: This conflicts with vectors
            if (mathfield.mode == "math" && keystroke == "[Enter]") {
              mathfield.blur?.();
              context.emit("move-cursor-out", new Vector2(0, 1));
            }
            return true;
          },
        });

        mathfield.value.setOptions({
          //@ts-ignore
          keybindings: mathfield.value.getOption("keybindings").concat([
            {
              key: "ctrl+[Period]",
              ifMode: "math",
              command: ["insert", "\\xrightarrow{\\placeholder{}}"],
            },
          ]),
        });

        const shortcuts = mathfield.value.getOption("inlineShortcuts");
        // @ts-ignore
        shortcuts["->"] = "\\xrightarrow{\\placeholder{}}";
        mathfield.value.setOptions({
          inlineShortcuts: shortcuts,
        });

        mathfield.value.style.fontSize = "18px";

        // Later down the road we can use "adoptedStyleSheets"
        const caretCustomStyle = document.createElement("style");
        caretCustomStyle.innerHTML = `.ML__caret:after {
          border-right-width: 0px !important;
          margin-right: 0px !important;
          width: 0px !important;
          box-shadow: 0px 0px 0px 1px var(--caret,hsl(var(--hue,212),40%,49%));
         }`;
        mathfield.value.shadowRoot?.appendChild?.(caretCustomStyle);

        value.innerHTML = "";
        value.appendChild(mathfield.value);

        if (expressionElement.focused.value) {
          mathfield.value.focus();
        }
      },
      {
        flush: "post",
      }
    );

    return {
      mathfieldContainer,
    };
  },
});
</script>
<style scoped>
</style>