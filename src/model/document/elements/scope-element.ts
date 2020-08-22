import { QuantumElementType, UseQuantumElement } from "../document-element";
import {
  ref,
  Ref,
  reactive,
  shallowRef,
  watch,
  watchEffect,
  computed,
  ComputedRef,
} from "vue";
import { Vector2 } from "../../vectors";
import arrayUtils from "../../array-utils";

export const ElementType = "scope-element";

export interface UseScopeElement extends UseQuantumElement {
  /**
   * Name of the scope, used for named imports
   */
  name: Ref<string>;

  /**
   * A closed scope does not auto-import variables from its parent scope
   */
  closed: Ref<boolean>;

  /**
   * Variables defined in this scope
   * 0th variable is always the import-variable
   */
  variableMap: ReadonlyMap<string, ScopedVariable[]>;

  // Note: I'll try to not use childScopes for now. I think I can get away without them.

  setName(value: string): void;

  addVariable(name: string, position: ComputedRef<Vector2>): UseScopedVariable;

  addGetter(name: string, position: ComputedRef<Vector2>): UseScopedGetter;
}

// TODO: Scope end element
// TODO: Child scopes

export interface UseScopedVariable {
  setData(data: any): void;
  remove(): void;
}

export interface UseScopedGetter {
  data: ComputedRef<any>;
  remove(): void;
}

// Internal interfaces
interface ScopedVariable {
  /**
   * Variable position
   */
  readonly position: Vector2;

  /**
   * Variable index in array
   */
  index: number;

  /**
   * Shallow ref variable data
   */
  data: any;

  /**
   * Variable getters
   */
  getters: ScopedGetter[];
}

interface ScopedGetter {
  /**
   * Getter position
   */
  readonly position: Vector2;

  /**
   * Getter variable
   */
  variable: ScopedVariable | undefined;
}

function createImporterVariable(
  position: ComputedRef<Vector2>
): ScopedVariable {
  const importerVariable: ScopedVariable = reactive({
    position: position,
    index: 0,
    data: shallowRef(),
    getters: [],
  });

  return importerVariable;
}

function removeVariable(
  variableArray: ScopedVariable[],
  variable: ScopedVariable
) {
  if (variable.index < 0) return;

  if (variable.getters.length > 0) {
    const prev = arrayUtils.getElementOrUndefined(
      variableArray,
      variable.index - 1
    );
    if (!prev) {
      throw new Error("Expected prev variable to exist");
    } else {
      prev.getters = prev.getters.concat(variable.getters);
      variable.getters.forEach((v) => {
        v.variable = prev;
      });
      variable.getters = [];
    }
  }

  // Remove variable and update indices
  variableArray.splice(variable.index, 1);
  for (let i = variable.index; i < variableArray.length; i++) {
    variableArray[i].index = i;
  }
  variable.index = -1;
}

function isInRange(value: Vector2, range: { start?: Vector2; end?: Vector2 }) {
  return (
    (!range.start || range.start.compareTo(value) <= 0) &&
    (!range.end || value.compareTo(range.end) < 0)
  );
}

function useScopeElement(block: UseQuantumElement): UseScopeElement {
  const name = ref("");
  const closed = ref(false);
  const variableMap = reactive(new Map<string, ScopedVariable[]>());

  function setName(value: string) {
    name.value = value;
  }

  /*const imports = computed(() => {
    variables.forEach((value, key) => {
      if(value[0].getters.length > 0) {
        .push()
      }
    });
  })*/

  function createVariableArray(
    name: string,
    position: ComputedRef<Vector2>
  ): ScopedVariable[] {
    const importerVariable = createImporterVariable(position);

    const newVariableArray = reactive([importerVariable]);
    watch(
      [() => newVariableArray.length, () => importerVariable.getters.length],
      ([variableArrayLength, gettersLength]) => {
        if (variableArrayLength <= 1 && gettersLength == 0) {
          variableMap.delete(name);
        }
      }
    );

    variableMap.set(name, newVariableArray);
    return newVariableArray;
  }

  function addVariable(name: string, position: ComputedRef<Vector2>) {
    // Add variable
    const variable: ScopedVariable = reactive({
      position: position,
      index: -1,
      data: shallowRef(),
      getters: [],
    });

    const variableArray =
      variableMap.get(name) ??
      createVariableArray(
        name,
        computed(() => block.position.value)
      );

    watch(
      () => variable.position,
      (value) => {
        // Remove (or bail out)
        if (variable.index >= 0) {
          if (variableArray[variable.index] != variable) {
            throw new Error(
              `Expected variable ${variable} to be in ${variableArray} at index ${variable.index}`
            );
          }

          const prev = arrayUtils.getElementOrUndefined(
            variableArray,
            variable.index - 1
          );
          const next = arrayUtils.getElementOrUndefined(
            variableArray,
            variable.index + 1
          );

          if (
            isInRange(value, { start: prev?.position, end: next?.position })
          ) {
            return;
          }

          removeVariable(variableArray, variable);
        }

        // Add
        const { index } = arrayUtils.getBinaryInsertIndex(variableArray, (v) =>
          v.position.compareTo(value)
        );

        const prev = arrayUtils.getElementOrUndefined(variableArray, index - 1);
        // Take some getters from prev
        if (prev?.getters) {
          variable.getters = prev.getters.filter(
            (v) => value.compareTo(v.position) <= 0
          );
          variable.getters.forEach((v) => {
            v.variable = variable;
          });
          prev.getters = prev.getters.filter(
            (v) => v.position.compareTo(value) < 0
          );
        }
        for (let i = index; i < variableArray.length; i++) {
          variableArray[i].index = i + 1;
        }
        variableArray.splice(index, 0, variable);
        variable.index = index;
      },
      {
        immediate: true,
      }
    );

    function setData(data: any) {
      variable.data = data;
    }

    function remove() {
      removeVariable(variableArray, variable);
    }

    return {
      setData,
      remove,
    };
  }

  function addGetter(name: string, position: ComputedRef<Vector2>) {
    const getter: ScopedGetter = reactive({
      position: position,
      variable: undefined,
    });
    const data = computed(() => getter.variable?.data);

    const variableArray =
      variableMap.get(name) ??
      createVariableArray(
        name,
        computed(() => block.position.value)
      );

    watch(
      () => getter.position,
      (value) => {
        if (getter.variable) {
          // If the getter is still in the correct position, bail out
          const nextVariable = arrayUtils.getElementOrUndefined(
            variableArray,
            getter.variable.index + 1
          );
          if (
            isInRange(value, {
              start: getter.variable.position,
              end: nextVariable?.position,
            })
          ) {
            return;
          }

          // Remove getter from old variable
          arrayUtils.remove(getter.variable.getters, getter);
          getter.variable = undefined;
        }

        const { index } = arrayUtils.getBinaryInsertIndex(variableArray, (v) =>
          v.position.compareTo(value)
        );

        const variable = arrayUtils.getElementOrUndefined(
          variableArray,
          index - 1
        );
        if (!variable) {
          throw new Error(
            `Getter position ${getter.position} outside of block ${block.position}`
          );
        } else {
          // Add getter to variable
          variable.getters.push(getter);
          getter.variable = variable;
        }
      },
      { immediate: true }
    );

    function remove() {
      if (!getter.variable) return;
      arrayUtils.remove(getter.variable.getters, getter);
      getter.variable = undefined;
    }

    return {
      data,
      remove,
    };
  }

  return {
    ...block,
    name,
    closed,
    variableMap: variableMap,
    setName,
    addVariable,
    addGetter,
  };
}

function serializeElement(element: UseScopeElement): string {
  throw new Error(`Serialization not implemented yet`);
}

function deserializeElement(data: string): UseScopeElement {
  throw new Error(`Serialization not implemented yet`);
}

export const ScopeElementType: QuantumElementType<
  UseScopeElement,
  typeof ElementType
> = {
  typeName: ElementType,
  documentType: {
    [ElementType]: {
      typeName: ElementType,
      useElement: useScopeElement,
      serializeElement: serializeElement,
      deserializeElement: deserializeElement,
    },
  },
};
