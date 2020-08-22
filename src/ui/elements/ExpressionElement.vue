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
import MathLive, { latexToMathjson, mathjsonToLatex } from "mathlive"; //TODO: Warning: I'm using a locally patched version of mathlive that uses the new MathJSON format
import "mathlive/dist/mathlive-fonts.css";
import { ElementCommands } from "./element-commands";
import { Vector2 } from "../../model/vectors";

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
      console.log("parsing", mathfield.value?.$text("latex-expanded"));
      const expression = latexToMathjson(
        mathfield.value?.$text("latex-expanded") + "",
        {
          form: "full",
          // @ts-ignore
          /*promoteUnknownSymbols: {
            test: (value) => {
              console.log(value);
              return false;
            },
          },*/
          //promoteUnknownSymbols: /^[a-zA-Z]([a-zA-Z]|$)/,
          //promoteUnknownFunctions: /^[fge][fg]$/,
          //preserveLatex: true,
          //dictionary: // TODO:
          //onError,
        }
      );

      // TODO: Verify that the expression has no issues
      // TODO: Regarding multi letter variables
      // - Add all known variables point to dictionary
      // - If it was none if them, interpret it as separate, 1 letter variables
      // TODO: What about multi letter functions?

      expressionElement.setExpression(expression);
    }

    // TODO: Remove this hack
    let dictionary = MathLive.DEFAULT_LATEX_DICTIONARY;
    console.log(dictionary);
    //@ts-ignore
    dictionary["inequalities"].find((v) => v.name == "Equal").parse = function (
      lhs,
      scanner,
      minPrec,
      _latex
    ) {
      if (260 < minPrec) return [lhs, null];
      const rhs = scanner.matchExpression(260);
      if (rhs == null) return [null, ["Equal", lhs, null]];
      return [null, ["Equal", lhs, rhs]];
    };

    watch(mathfieldElement, (value) => {
      if (value) {
        mathfield.value = MathLive.makeMathField(value, {
          defaultMode: "math",
          smartSuperscript: true,
          onContentDidChange: (_) => {},
          onFocus: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(true);
            context.emit("focused-element-commands", {
              elementType: ElementType,
              moveToStart: () => mathfield.$perform("moveToMathFieldStart"),
              moveToEnd: () => mathfield.$perform("moveToMathFieldEnd"),
              insert: (text: string) => {
                if (text.startsWith("\\")) {
                  mathfield.$insert(text, { mode: "command" });
                } else {
                  mathfield.$insert(text);
                }
              },
            });
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(false);
            context.emit("focused-element-commands", undefined);

            if (mathfield.$text("latex").length == 0) {
              context.emit("delete-element");
            } else {
              evaluateExpression();
            }
          },
          onMoveOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit(
              "move-cursor-out",
              new Vector2(direction == "forward" ? 1 : -1, 0)
            );
            return false;
          },
          onTabOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit(
              "move-cursor-out",
              new Vector2(direction == "forward" ? 1 : -1, 0)
            );
            return true;
          },
        });

        if (expressionElement.focused) {
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