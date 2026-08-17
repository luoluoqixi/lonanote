import { LonaEditor } from "./index";
import "./styles.css";

const root = document.getElementById("editor");

if (!root) {
  throw new Error("编辑器根节点不存在");
}

const editor = new LonaEditor();

editor.create({
  root,
  defaultValue: "\n\n\n# LonaNote\n\n开始编辑你的笔记。",
  filePath: "untitled.md",
  theme: "light",
  extensionsConfig: {
    enableLineWrapping: true,
    enableLineNumbers: false,
  },
  markdownConfig: {
    formattingDisplayMode: "auto",
    defaultSlashMenu: { show: false },
  },
});
