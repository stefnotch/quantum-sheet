<template>
  <div class="mathfield" ref="mathfieldElement" tabindex="0"></div>
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
import MathLive, { latexToMathjson, mathjsonToLatex } from "mathlive"; //TODO: Warning: I'm using a locally patched version of mathlive that uses the new MathJSON format
import { ElementCommands } from "./element-commands";
import { Vector2 } from "../../model/vectors";
import { something } from "./hak-mathlive-dictionary";

console.log(something);

export { ExpressionElementType };

export default defineComponent({
  props: {
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
    const mathfieldElement = ref<HTMLElement>();
    const mathfield = shallowRef<MathLive.Mathfield>();
    const expressionElement = props.modelGetter();

    watch(expressionElement.expression, (value) => {
      mathfield.value?.$latex(
        mathjsonToLatex(value, {
          multiply: "\\cdot",
          invisibleMultiply: "\\cdot",
        }),
        {
          suppressChangeNotifications: true,
          mode: "math",
          format: "latex",
        }
      );
    });

    watch(
      () => expressionElement.focused.value,
      (value) => (value ? mathfield.value?.$focus() : mathfield.value?.$blur())
    );

    function evaluateExpression() {
      const expression = latexToMathjson(
        (mathfield.value?.$text("latex-expanded") + "").replaceAll("^{}", ""),
        {
          form: ["full"], // TODO: Mathjson can have objects like {num:"3"} instead of 3
          // @ts-ignore
          /*promoteUnknownSymbols: {
            test: (value) => {
              console.log(value);
              return false;
            },
          },*/
          //promoteUnknownSymbols: /^[a-zA-Z]([a-zA-Z]|$)/,
          //promoteUnknownFunctions: /^[fge][fg]$/,
          //dictionary: // TODO:
          //onError,
        }
      );
      console.log(
        "Parsing",
        mathfield.value?.$text("latex-expanded"),
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
    watch(mathfieldElement, (value) => {
      if (value) {
        mathfield.value = MathLive.makeMathField(value, {
          defaultMode: "math",
          smartSuperscript: true,
          onContentDidChange: (_) => {
            // TODO: Don't try to compute anything while I'm editing the mathfield
          },
          onFocus: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(true);
            context.emit("focused-element-commands", {
              elementType: ElementType,
              moveToStart: () => mathfield.$perform("moveToMathFieldStart"),
              moveToEnd: () => mathfield.$perform("moveToMathFieldEnd"),
              insert: (text: string) => {
                if (text == "/") {
                  mathfield.$perform(["insert", "$$\\frac{#@}{#?}$$"]);
                } else if (text == "\n") {
                  mathfield.$blur();
                } else if (text == ">") {
                  mathfield.$perform("deletePreviousChar");
                  mathfield.$perform([
                    "insert",
                    "\\xrightarrow{\\placeholder{}}",
                  ]);
                } else {
                  mathfield.$perform([
                    "typedText",
                    text,
                    { simulateKeystroke: true },
                  ]);
                }
                /*
                if (text.startsWith("\\")) {
                  mathfield.$insert(text, { mode: "command" });
                } else {
                  mathfield.$insert(text, {
                    resetStyle: false,
                    smartFence: false,
                    feedback: false,
                  });
                }*/
              },
            });
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(false);
            context.emit("focused-element-commands", undefined);

            if (mathfield.$text("latex").length == 0) {
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
              mathfield.$blur();
              context.emit("move-cursor-out", new Vector2(0, 1));
            }
            return true;
          },
        });

        mathfield.value.$setConfig({
          keybindings: mathfield.value.getConfig("keybindings").concat([
            {
              key: "ctrl+[Period]",
              ifMode: "math",
              command: ["insert", "\\xrightarrow{\\placeholder{}}"],
            },
          ]),
        });

        const shortcuts = mathfield.value.getConfig("inlineShortcuts");
        shortcuts["->"] = "\\xrightarrow{\\placeholder{}}";
        mathfield.value.$setConfig({
          inlineShortcuts: shortcuts,
        });

        if (expressionElement.focused.value) {
          mathfield.value.$focus();
        }
      }
    });

    return {
      mathfieldElement,
    };
  },
});
</script>
<style scoped>
</style>