import { shallowRef, shallowReactive } from "vue";
import { ShallowRef } from "./types";

export interface TreeNode<T> {
  value: T;
  children: ReadonlyArray<TreeNode<T>>;
  parent: ShallowRef<TreeNode<T> | undefined>;
  setParent(value: TreeNode<T> | undefined): void;
  addChild(value: TreeNode<T>): void;
  removeChild(value: TreeNode<T>): void;
}

/**
 * Wraps an object
 * @param value Object to wrap
 */
export function useTreeNode<T>(value: T): TreeNode<T> {
  const children = shallowReactive<TreeNode<T>[]>([]);
  const parent = shallowRef<TreeNode<T>>();

  const treeNode: TreeNode<T> = {
    value,
    children,
    parent,
    setParent: function (value: TreeNode<T> | undefined) {
      if (parent.value == value) return;
      let oldValue = parent.value;
      parent.value = undefined;
      oldValue?.removeChild(this);

      parent.value = value;
      parent.value?.addChild(this);
    },
    addChild: function (value: TreeNode<T>) {
      value.setParent(this);
      if (!children.includes(value)) {
        children.push(value);
      }
    },
    removeChild: function (value: TreeNode<T>) {
      if (children.includes(value)) {
        value.setParent(undefined);
        const index = children.indexOf(value);
        if (index >= 0) {
          children.splice(index, 1);
        }
      }
    },
  };

  return treeNode;
}
