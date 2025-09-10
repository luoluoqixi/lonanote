# 露娜笔记 (LonaNote)

[中文](README.md) | [English](README_en.md)

一款本地优先的开源笔记软件，使用 **TypeScript**、**Dart** 和 **Rust** 编写。

## 🎉 简介

**露娜笔记**是一款开源、跨平台、本地优先的 Markdown 笔记软件，支持 Markdown 的所见即所得（WYSIWYG）。

笔记将以开放的 Markdown 格式**离线保存在本地**，您可以随意切换到其他笔记软件而无需导入导出。

**支持的平台**：`Windows`、`MacOS`、`Linux`、`Android`、`iOS`。


## ✨ 主要功能

- **本地存储** - 完全本地存储 Markdown 文本文件
- **使用原始文件系统** - 无数据库
- **所见即所得编辑** - 实时预览
- **架构** - 桌面端使用 Electron，移动端使用 Flutter，核心使用 Rust


### 🎹 快捷键

**LonaNote** 提供以下快捷键来提高编辑效率：

`Ctrl+B` - **加粗**

`Ctrl+I` - *斜体*

`Ctrl+D` - ~~删除线~~

`Ctrl+H` - ==高亮==


## 🚀 安装

- **Windows | Mac | Linux | Android**： [从Release下载](https://github.com/luoluoqixi/lonanote/releases)
- **iOS**： App Store


## 🗺 待办

露娜笔记在积极开发中，欢迎贡献代码


## 💬 社区

- [Github Discussions](https://github.com/luoluoqixi/lonanote/discussions)

- QQ 群：978017481


## 🙏 致谢

特别感谢这些优秀项目带来的灵感：

- [PurrMD](https://github.com/luoluoqixi/purrmd) - 所见即所得编辑器支持
- [HyperMD](https://github.com/laobubu/HyperMD) - 开创性的 WYSIWYG Markdown 编辑体验
- [CodeMirror6](https://codemirror.net/) - 强大的编辑器内核

如果没有以上项目，那么就不会有 LonaNote


## 📝 许可证

[MIT license](https://github.com/luoluoqixi/lonanote/blob/main/LICENSE)



## 🌈 Markdown 语法示例

## 文本格式

这里测试了**加粗**、*斜体*、~~删除线~~和 `行内代码`。

**组合*格式*，并包含 `代码`。**

==高亮==

## 行内图片

[![Build Status](https://github.com/luoluoqixi/lonanote/actions/workflows/release.yml/badge.svg)](https://github.com/luoluoqixi/lonanote/actions/workflows/release.yml)


## 标题

# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

## 代码块

### 行内

调试时使用 `console.log('Hello')`。

### 块级

```javascript
function hello() {
  console.log('Hello LonaNote!');
  return true;
}
```

## 引用块

> 这是一个引用块。
>> 嵌套引用块。


## 链接

[GitHub](https://github.com/luoluoqixi/lonanote)

[带标题的链接](https://github.com/luoluoqixi/lonanote "LonaNote")


## 列表

### 无序列表

- 项目 1
- 项目 2
    - 嵌套项目 2.1
    - 嵌套项目 2.2
        - 嵌套项目 2.2.1
        - 嵌套项目 2.2.2
        - 嵌套项目 2.2.3

### 有序列表

1. 第一项
2. 第二项
    1. 嵌套有序 2.1
    2. 嵌套有序 2.2
        1. 嵌套有序 2.2.1
        2. 嵌套有序 2.2.2
        3. 嵌套有序 2.2.3

## 任务列表

### 无序任务列表

- [x] 已完成任务
    - [x] 嵌套完成任务
    - [x] 嵌套完成任务
- [ ] 未完成任务
    - [ ] 嵌套未完成任务
    - [ ] 嵌套未完成任务
        - [ ] 嵌套未完成任务
        - [ ] 嵌套未完成任务

### 有序任务列表

1. [x] 已完成任务
    1. [x] 嵌套完成任务
    2. [x] 嵌套完成任务
2. [ ] 未完成任务
    1. [ ] 嵌套未完成任务
    2. [ ] 嵌套未完成任务
        1. [ ] 嵌套未完成任务
        2. [ ] 嵌套未完成任务

## 图片

![Image](assets/images/icon.png)


## 表格

| 姓名   | 年龄 | 城市   |
| ------ | --- | ------ |
| Alice  | 24  | London |
| Bob    | 29  | Paris  |


## 分隔线

---

