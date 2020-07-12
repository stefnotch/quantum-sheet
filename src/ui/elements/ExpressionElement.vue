<template>
  <div class="mathfield" ref="mathfieldElement" tabindex="0"></div>
  <!--If you need a second element, just create it next to the mathfield?-->
  <!--Though, you gotta figure out the whole listeners and attributes stuff-->
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, shallowRef, toRef } from "vue";
import {
  ExpressionElement,
  ElementType,
  ElementFunctions
} from "../../model/document/elements/expression-element";
import MathLive from "mathlive";
import { Vec2 } from "src/model/document/vectors";

export {
  ElementType as ExpressionElementType,
  ElementFunctions as ExpressionElementFunctions
};

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<ExpressionElement>,
      default: () => ({} as ExpressionElement)
    },
    focused: {
      type: Boolean,
      default: () => false
    }
  },
  emits: {
    "update:model-value": (value: ExpressionElement) => true,
    "update:focused": (value: boolean) => true,
    "focused-element-commands": (value: any | {}) => true,
    "move-cursor-out": (direction: Vec2) => true,
    "delete-element": () => true
  },
  setup(props, context) {
    const mathfieldElement = ref<HTMLElement>();
    const mathfield = shallowRef<MathLive.Mathfield>();

    watch(
      () => props.modelValue,
      (value, oldValue) => {
        let latex = "" + value.expression;
        mathfield.value?.$latex(latex, { suppressChangeNotifications: true });
      }
    );

    watch(
      () => props.focused,
      value => (value ? mathfield.value?.$focus() : mathfield.value?.$blur())
    );

    watch(mathfieldElement, value => {
      if (value) {
        mathfield.value = MathLive.makeMathField(value, {
          fontsDirectory: "http://localhost:3000/@modules/mathlive/dist/fonts", // TODO: Remove this horrible hack
          onContentDidChange: _ => {
            context.emit("update:model-value", {
              expression: mathfield.value?.$text("latex") as any
            });
          },
          onFocus: (mathfield: MathLive.Mathfield) => {
            context.emit("update:focused", true);
            context.emit("focused-element-commands", {
              elementType: ElementType,
              moveToStart: () => mathfield.$perform("moveToMathFieldStart"),
              moveToEnd: () => mathfield.$perform("moveToMathFieldEnd"),
              insert: (text: string) => mathfield.$insert(text, {})
            });
          },
          onBlur: (mathfield: MathLive.Mathfield) => {
            context.emit("update:focused", false);
            context.emit("focused-element-commands", {});

            if (mathfield.$text("latex").length == 0) {
              context.emit("delete-element");
            }
          },
          onMoveOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit("move-cursor-out", {
              x: direction == "forward" ? 1 : -1,
              y: 0
            });
            return false;
          },
          onTabOutOf: (mathfield: MathLive.Mathfield, direction) => {
            context.emit("move-cursor-out", {
              x: direction == "forward" ? 1 : -1,
              y: 0
            });
            return true;
          }
        });

        if (props.focused) {
          mathfield.value.$focus();
        }
      }
    });

    return {
      mathfieldElement
    };
  }
});
</script>
<style scoped>
</style>