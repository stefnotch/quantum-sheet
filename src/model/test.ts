import { TreeNode, useTreeNode } from "./tree-node";
import { Vec2 } from "./vectors";
import { Ref } from "vue";

interface Scope extends TreeNode<Scope> {
  /**
   * Name of the scope, used for named imports
   */
  name: string;

  /**
   * Absolute start position
   */
  startPosition: Vec2;

  /**
   * Absolute end position
   */
  endPosition: Vec2;

  /**
   * A closed scope does not auto-import variables from its parent scope
   */
  closed: boolean;

  /**
   * Variables defined in this scope
   */
  variables: Map<string, Variable[]>;
}

class QuantumScope implements Scope {
  name = "";
  startPosition = { x: 0, y: 0 };
  endPosition = { x: 0, y: 0 };
  closed = false;
  variables = new Map<string, Variable[]>();
  readonly children: Scope[];
  readonly parent: Ref<Scope | undefined>;
  constructor() {
    const treeNode = useTreeNode<Scope>(this);
    this.children = treeNode.children;
    this.parent = treeNode.parent;
    this.setParent = treeNode.setParent;
    this.addChild = treeNode.addChild;
    this.removeChild = treeNode.removeChild;
  }

  setParent(value: Scope | undefined) {}
  addChild(value: Scope) {}
  removeChild(value: Scope) {}
}
