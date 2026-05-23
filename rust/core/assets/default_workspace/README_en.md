# LonaNote

[中文](./README.md) | [English](./README_en.md)

A local-first, open-source note-taking app built with **TypeScript** and **Rust**.

## 🎉 Introduction

**LonaNote** is an open-source, cross-platform, local-first Markdown note-taking app with WYSIWYG (What You See Is What You Get) editing.

Notes are **stored offline** in plain Markdown format, allowing seamless migration to other note-taking apps without import/export hassles.

**Supported Platforms**: `Windows`, `macOS`, `Linux`, `Android`, `iOS`.


## ✨ Key Features

- **Local storage** - Plain Markdown files, no vendor lock-in
- **File-system based** - No proprietary databases
- **WYSIWYG editing** - Real-time preview
- **Architecture** - Tauri + React Native Web on desktop, Expo / React Native on mobile, Rust in the core layer


### 🎹 Shortcuts

**LonaNote** provides the following shortcuts to improve editing efficiency:

`Ctrl+B` - Bold

`Ctrl+I` - Italic

`Ctrl+D` - Strikethrough

`Ctrl+H` - Highlight


## 🚀 Installation

- **Windows | macOS | Linux | Android**: [Download from Releases](https://github.com/luoluoqixi/lonanote/releases)
- **iOS**: [App Store](https://apps.apple.com/app/app/id6752297620)


## 🗺 Roadmap

LonaNote is under active development—contributions welcome!


## 💬 Community

- [GitHub Discussions](https://github.com/luoluoqixi/lonanote/discussions)
- **QQ Group**: 978017481


## 🙏 Acknowledgments

Special thanks to these excellent projects for inspiration:

- [PurrMD](https://github.com/luoluoqixi/purrmd) - WYSIWYG editor support
- [HyperMD](https://github.com/laobubu/HyperMD) - Pioneering WYSIWYG Markdown editing experience
- [CodeMirror6](https://codemirror.net/) - Powerful editor core

Without the above projects, PurrMD would not exist.


## 📝 License

[MIT License](https://github.com/luoluoqixi/lonanote/blob/main/LICENSE)



## 🌈 Markdown Demo


## Text Formatting

This tests **bold**, *italic*, ~~strikethrough~~, and `inline code`.

**Combined *formatting* with `code` inside.**

==highlight==

## Inline Image

[![Build Status](https://github.com/luoluoqixi/lonanote/actions/workflows/release.yml/badge.svg)](https://github.com/luoluoqixi/lonanote/actions/workflows/release.yml)

## Headers

# H1
## H2
### H3
#### H4
##### H5
###### H6

## Code Blocks

### Inline

Use `console.log('Hello')` for debugging.

### Block

```javascript
function hello() {
  console.log('Hello LonaNote!');
  return true;
}
```

## Blockquotes

> This is a blockquote.
>> Nested blockquote.

## Links

[GitHub](https://github.com/luoluoqixi/lonanote)

[Link with title](https://github.com/luoluoqixi/lonanote "LonaNote")

## Lists

### Unordered

- Item 1
- Item 2
    - Nested item 2.1
    - Nested item 2.2
        - Nested item 2.2.1
        - Nested item 2.2.2
        - Nested item 2.2.3

### Ordered

1. First item
2. Second item
    1. Nested ordered 2.1
    2. Nested ordered 2.2
        1. Nested ordered 2.2.1
        2. Nested ordered 2.2.2
        3. Nested ordered 2.2.3

## Task Lists

### Unordered

- [x] Completed task
    - [x] Nested Completed task
    - [x] Nested Completed task
- [ ] Incomplete task
    - [ ] Nested Incomplete task
    - [ ] Nested Incomplete task
        - [ ] Nested Incomplete task
        - [ ] Nested Incomplete task

### Ordered

1. [x] Completed task
    1. [x] Nested Completed task
    2. [x] Nested Completed task
2. [ ] Incomplete task
    1. [ ] Nested Incomplete task
    2. [ ] Nested Incomplete task
        1. [ ] Nested Incomplete task
        2. [ ] Nested Incomplete task

## Image

![Image](assets/images/icon.png)

## Tables

| Name   | Age | City    |
| ------ | --- | ------- |
| Alice  | 24  | London  |
| Bob    | 29  | Paris   |


## Horizontal Rule

---
