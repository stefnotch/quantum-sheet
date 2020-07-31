import { shallowRef, shallowReactive, Ref } from "vue";

export interface TreeNode<T extends TreeNode<T>> {
  readonly children: ReadonlyArray<T>;
  readonly parent: Ref<T | undefined>;
  setParent(value: T | undefined): void;
  addChild(value: T): void;
  removeChild(value: T): void;
}

/*
interface SomeObject {
  someProperty: string;
}

interface TCDerp extends TreeNode<MyInterface>, SomeObject {
  // Multiple inheritance and self referencing generics
}

let x: MyInterface;*/

export function useTreeNode<T extends TreeNode<T>>(self: T) {
  const parent = shallowRef<T>();
  const children = shallowReactive<T[]>([]);

  function setParent(value: T | undefined) {
    if (parent.value == value) return;
    let oldValue = parent.value;
    parent.value = undefined;
    oldValue?.removeChild(self);

    parent.value = value;
    parent.value?.addChild(self);
  }
  function addChild(value: T) {
    value.setParent(self);
    if (!children.includes(value)) {
      children.push(value);
    }
  }
  function removeChild(value: T) {
    if (children.includes(value)) {
      value.setParent(undefined);
      const index = children.indexOf(value);
      if (index >= 0) {
        children.splice(index, 1);
      }
    }
  }

  return {
    parent,
    children,
    setParent,
    addChild,
    removeChild,
  };
}
