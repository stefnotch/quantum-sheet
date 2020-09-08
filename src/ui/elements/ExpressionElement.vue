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
      const expression = latexToMathjson(
        mathfield.value?.$text("latex-expanded") + "",
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
    //@ts-ignore
    dictionary["inequalities"].find(
      (v) => v.name == "EqualEqual"
    ).precedence = 265;
    //@ts-ignore
    dictionary["algebra"][
      //@ts-ignore
      dictionary["algebra"].findIndex((v) => v.name == "To")
    ] = {
      emit: function (emitter, expr) {
        if (!Array.isArray(expr)) throw new Error("Expect array expression");

        return `${emitter.wrap(expr[1], 260)}\\xrightarrow{${
          Array.isArray(expr[2]) && expr[2][0] == "Missing"
            ? "\\placeholder{}"
            : expr[2]
        }}${emitter.wrap(expr[3], 260)}`;
      },
      precedence: 260,
      name: "To",
      optionalLatexArg: 1,
      requiredLatexArg: 1,
      parse: function (lhs, scanner, minPrec, _latex) {
        if (260 < minPrec) return [lhs, null];
        scanner.matchOptionalLatexArgument();
        //const solveArgument = scanner.matchRequiredLatexArgument(); // TODO: Add the solve keyword to known stuff
        let solveArgument = "";
        scanner.skipSpace();
        if (scanner.match("<{>")) {
          let level = 1;
          while (!scanner.atEnd() && level !== 0) {
            if (scanner.match("<{>")) {
              level += 1;
            } else if (scanner.match("<}>")) {
              level -= 1;
            } else if (scanner.match("<space>")) {
              solveArgument += " ";
            } else {
              solveArgument += scanner.next();
            }
          }
        }

        const rhs = scanner.matchExpression(260);
        return [
          null,
          [
            "To",
            lhs,
            solveArgument == "\\placeholder" ? ["Missing", ""] : solveArgument,
            rhs,
          ],
        ];
      },
      trigger: { infix: "\\xrightarrow" },
    };

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

        const keybindings = mathfield.value.getConfig("keybindings");
        mathfield.value.$setConfig({
          keybindings: keybindings.concat([
            {
              key: "ctrl+[Period]",
              ifMode: "math",
              command: ["insert", "\\xrightarrow{\\placeholder{}}"],
            },
          ]),
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