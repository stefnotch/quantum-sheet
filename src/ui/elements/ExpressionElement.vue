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
import MathLive from "mathlive";
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

    watch(
      () => expressionElement.expression.value,
      (value, oldValue) => {
        let latex = "" + value;
        mathfield.value?.$latex(latex, { suppressChangeNotifications: true });
      }
    );

    watch(
      () => expressionElement.focused.value,
      (value) => (value ? mathfield.value?.$focus() : mathfield.value?.$blur())
    );

    watch(mathfieldElement, (value) => {
      if (value) {
        mathfield.value = MathLive.makeMathField(value, {
          fontsDirectory: "http://localhost:3000/@modules/mathlive/dist/fonts", // TODO: Remove this horrible hack
          onContentDidChange: (_) => {
            expressionElement.setExpression(mathfield.value?.$text("latex"));
          },
          onFocus: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(true);
            context.emit("focused-element-commands", {
              elementType: ElementType,
              moveToStart: () => mathfield.$perform("moveToMathFieldStart"),
              moveToEnd: () => mathfield.$perform("moveToMathFieldEnd"),
              insert: (text: string) => mathfield.$insert(text, {}),
            });
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            expressionElement.setFocused(false);
            context.emit("focused-element-commands", undefined);

            if (mathfield.$text("latex").length == 0) {
              context.emit("delete-element");
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