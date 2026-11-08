# 第三方许可维护

在 ui 目录安装好应用和编辑器依赖后，运行唯一命令：

```sh
bun run licenses:generate
```

工具使用 Bun 执行 generate.js 和 download.js，不执行 Git 或安装依赖。构建使用同一个生成入口。

## 两份发布文本

- ui/assets/licenses/LICENSES.txt：自动生成的直接运行时依赖和显式登记资源许可。
- ui/assets/licenses/ALL_LICENSES.txt：上述内容，加上补充区内的历史、间接依赖和原生平台声明。

重新生成会更新两份文本的直接依赖部分，并原样保留 ALL_LICENSES.txt 中以下分隔行之后的内容：

```text
===== Additional Third-Party Notices =====
```

分隔行及其前后空行不要修改。需要添加上游提供的总 LICENSE / NOTICE 时，将完整原文连同项目名称、版本和来源链接追加到该文件末尾即可。无需单独的 materials、JSON 清单或报告目录。

**ALL_LICENSES.txt 的补充区是唯一保存的声明原文，需要提交并保留。删除整个文件后无法仅靠生成命令恢复这些补充材料。** 分隔标记缺失时生成器停止，避免覆盖原文。写入使用临时文件完成后替换，临时文件已忽略。

## 自动收集规则

- npm：读取应用和内嵌编辑器 package.json 的 dependencies 及安装版本，收集 LICENSE、COPYING、NOTICE 等正文；排除开发依赖、workspace 自有包和明确登记的开发工具。
- Rust：读取 Core、工具库、Tauri 和 RN Rust 绑定的 Cargo.toml / Cargo.lock，包含 target 条件与 workspace 继承，排除 dev/build/path 自有依赖。
- CodeMirror、React Navigation 子包按项目合并标题，相同正文去重。
- 字体等非包管理器资源在 generate.js 的 bundledAssets 中登记。目前包含 Fira Code 6.2，正文位于 ui/assets/fonts/fira_code/LICENSE.txt。

本地缺少正文时，通过 HTTPS 获取准确版本材料：Cargo 发布包校验锁文件 checksum，仓库回退使用发布包或锁文件中的 commit；npm 使用准确版本 gitHead。使用 GitHub 官方 API，不读取最新分支、不使用通用模板替代上游声明。

成功下载缓存到已忽略的 .temp/license_materials/，可随时删除，后续会重新下载。网络失败或上游本身没有正文时输出警告，不阻止构建。当前 dark-light 2.0.0 的准确版本材料缺少独立 LICENSE，仍会提示。


## 展示与验证

应用内直接展示这两份离线文本，支持复制，长文本分段虚拟化。Metro 将 TXT 作为静态资源；Web/Tauri 读取资源 URL，Android/iOS 读取本地 asset。

许可测试集中在一个文件：

```sh
bun test ./tests/third_party.test.tsx
```
