# LonaNote Project Guidelines

## Overview

LonaNote（露娜笔记）是一款本地优先的跨平台 Markdown 笔记应用。

- 笔记以普通 Markdown 文件直接存储在文件系统中，不使用数据库。
- 当前项目同时覆盖桌面端和移动端：`Windows`、`macOS`、`Linux`、`Android`、`iOS`。
- 桌面端通过 `Tauri + React Native Web` 运行，移动端通过 `Expo / React Native` 运行。
- 共享业务能力集中在 Rust `command` 接口中，由不同运行时桥接到前端。

## Current Stack

- **UI**: React Native 0.83 + Expo 55 + Expo Router
- **Desktop shell**: Tauri 2（位于 `ui/src-tauri/`）
- **Mobile Rust bridge**: Craby React Native 原生模块（位于 `ui/rust/`）
- **Shared core**: Rust `lonanote-core`（位于 `rust/core/`）
- **Command registry**: `cmdreg`
- **Build/dev tooling**: Rust CLI（位于 `cli/`）+ Bun 脚本 + Cargo

## Repository Layout

| Directory | Purpose |
|-----------|---------|
| `ui/` | React Native / Expo 应用；包含移动端、Web 和共享前端代码 |
| `ui/src-tauri/` | Tauri 桌面壳，负责桌面端 Rust command 接入 |
| `ui/rust/` | Craby 原生模块工程，负责 React Native 侧 Rust API 接入 |
| `ui/src/api/invoke/` | 统一 invoke 抽象；运行时在 Tauri 和 React Native 原生模块之间切换 |
| `rust/core/` | 共享 Rust 核心能力与 command 定义 |
| `cli/` | 开发、构建、发布、图标生成等 CLI 工具 |
| `docs/` | 文档和截图 |
| `resources/` | 资源文件，例如图标 |

## Workspaces and Toolchains

- 根目录 `Cargo.toml` 管理桌面相关 Rust workspace：主要包含 `rust/core/` 与 `ui/src-tauri/`。
- `ui/rust/` 是独立的 Cargo workspace，不受根 workspace 管理。
- `ui/rust/` 现在也必须使用 `nightly` toolchain，因为它通过 `lonanote-core` 间接依赖 `cmdreg` 的 nightly feature。
- 前端包管理与脚本执行以 **Bun** 为主；`ui/rust/` 模块包自身也有独立的 npm-compatible scripts。
- 桌面端开发/构建命令依赖 `cargo-tauri` CLI；如果本地执行 `cargo tauri dev/build`，需先安装对应版本的 Tauri CLI。

## Main Runtime Flow

前端统一通过 `ui/src/api/invoke/` 访问 Rust command：

1. `ui/src/api/invoke/index.ts` 对外提供统一 `invoke()` API。
2. 运行时判断：
	- 桌面端走 `ui/src/api/invoke/invoke.ts`，通过 Tauri command 调用 Rust。
	- Android / iOS 走 `ui/src/api/invoke/invoke.native.ts`，通过 `lonanote_rust_module` 调用 Craby 原生模块。
3. 实际 command 实现在 `rust/core/`，由 `lonanote_core::init()` 注册全部 command。

如果修改了 command 注册、参数结构或返回值，要同时检查：

- `rust/core/`
- `ui/src-tauri/src/commands/`
- `ui/rust/`
- `ui/src/api/invoke/`

## Workspace Roots And Identity

当前工作区模型的目标有三个：

1. `WorkspaceMetadata` 保持简单，只代表当前已解析出的工作区目录。
2. 工作区身份和工作区路径拆开，避免路径变化时丢失索引能力。
3. 移动端先支持应用沙盒内的工作区目录，后续再扩展到 iOS bookmark / Android tree uri 这类非普通文件路径来源。

### Current workspace data model

- `WorkspaceMetadata`（`rust/core/src/workspace/workspace_metadata.rs`）当前包含：
	- `id`：工作区稳定标识。
	- `path`：当前可访问的绝对路径。
	- `name`：当前目录名。
	- `createTime`：工作区创建时间语义。
	- `updateTime`：最近一次被 registry 刷新的时间。
- `WorkspaceMetadata` 不再保存 `rootPath`。
- `WorkspaceSettings`（`rust/core/src/workspace/workspace_settings.rs`）除了业务设置，还承担工作区本地身份信息：
	- `id` 是工作区稳定标识，首次识别工作区时自动生成。
	- `createTime` 表示工作区首次被应用识别时记录的创建时间；它不是路径索引字段，不参与唯一性判断，而是为了在路径迁移、roots 重扫后保留原始时间语义。
- `WorkspaceSaveData`（`rust/core/src/workspace/workspace_savedata.rs`）现在按工作区 `id` 存储，而不是按路径存储；这样路径变化后用户数据仍然可以跟着迁移。
- `WorkspaceRecord`（`rust/core/src/workspace/workspace_registry.rs`）是当前 registry 的最小持久化单元，包含：
	- `metadata`
	- `locator`
	- `saveData`
- `WorkspaceRuntimeConfig`（`rust/core/src/workspace/workspace_instance.rs`）是当前 runtime 侧真正需要热更新的配置子集，当前包含：
	- `fileTreeSortType`
	- `followGitignore`
	- `customIgnore`
- `WorkspaceRuntimeStatus`（`rust/core/src/workspace/workspace_instance.rs`）当前包含：
	- `opening`
	- `opened`
	- `reinitializing`
	- `closing`
- `WorkspaceInstance` 不再持有完整 `WorkspaceSettings`；运行时只保留：
	- `workspace_id`
	- `workspace_path`
	- `runtime_config`
	- `runtime_status`
	- `index`

### Current workspace layering

- `rust/core/src/workspace/mod.rs` 当前不再暴露单一 `WorkspaceManager`。
- 全局状态已拆成两份：
	- `WORKSPACE_REGISTRY`：持久化工作区状态，类型是 `RwLock<WorkspaceRegistry>`。
	- `WORKSPACE_RUNTIME`：打开态工作区状态，类型是 `RwLock<WorkspaceRuntime>`。
- 对外访问入口也按职责拆分：
	- `get_workspace_registry()` / `get_workspace_registry_mut()`
	- `get_workspace_runtime()` / `get_workspace_runtime_mut()`
- 设计原则是：
	- registry 负责 `record/settings/savedata/roots/lastWorkspaceId` 这类持久化与可恢复状态。
	- runtime 只负责当前已经打开的 `WorkspaceInstance`。
	- 不要再把持久化设置直接塞进 runtime 容器里，也不要再把打开态缓存混进 registry。

### Workspace roots

- roots 相关实现位于 `rust/core/src/workspace/workspace_locator.rs`。
- 当前 locator 形态：
	- `AbsolutePath`
	- `ManagedRoot`
	- `IosBookmark`（预留）
	- `AndroidTreeUri`（预留）
- 当前真正落地的是 `AbsolutePath` 和 `ManagedRoot`。
- `WorkspaceRoot` 当前除了 `key/path/kind`，还包含 `source` 元数据，用于区分：
	- `systemDefault`
	- `userAdded`
	- `iosBookmark`（预留）
	- `androidTreeUri`（预留）

### `workspaces/` directory convention

- 每个受控 root 的实际扫描目录固定为 `<basePath>/workspaces`。
- 常量定义：`DEFAULT_WORKSPACES_DIR_NAME = "workspaces"`。
- Rust 侧 `set_workspace_roots` 会把传入的 root 路径自动规范化到 `workspaces/` 目录。
- 启动阶段传入的应当是“容器根路径”，例如：
	- iOS app document 容器
	- iOS shared container 容器
	- Android app sandbox 容器
- 如果调用方传入的路径本身已经是 `.../workspaces`，Rust 不会重复追加。

### Startup registration flow

- Native 启动顺序位于 `ui/src/api/invoke/invoke.native.ts`：
	1. `LonanoteRustModule.init()`
	2. `path.init_dir` 初始化 app paths
	3. `workspace.registry.set_workspace_roots` 注册 roots，并立即触发同步
- 当前默认注册策略：
	- Android / iOS 都注册 `Paths.document` 对应的 app sandbox 容器。
	- iOS 额外 best-effort 读取 `Paths.appleSharedContainers`，并注册为 `mobileAppCloud` roots。
- Rust 侧会把这些容器路径统一映射到 `workspaces/` 子目录。
- `Paths.appleSharedContainers` 当前只是 best-effort 接入，是否真正对应 iCloud 相关容器依赖原生配置和 Expo 提供的数据。
- Desktop 目前仍然以绝对路径工作区为主，不主动注册默认 roots；roots 模型当前主要服务于移动端路径恢复和未来扩展。

### Root sync behavior

- 持久化 registry 位于 `rust/core/src/workspace/workspace_registry.rs`；打开态 runtime 位于 `rust/core/src/workspace/workspace_runtime.rs`。
- `sync_workspace_roots()` 位于 `rust/core/src/workspace/workspace_registry.rs`。
- roots 配置现在已经进入 `WorkspaceRegistry` 持久化，而不再只是 `workspace_locator.rs` 里的纯运行时全局状态。
- 当前同步流程：
	1. 扫描所有已注册 roots 下的 `workspaces/` 目录。
	2. 读取每个工作区的 `workspace.json`。
	3. 只接受带稳定 `id` 的工作区；没有 `id` 的目录会被跳过，不做兼容迁移。
	4. 按 `id` 匹配已有工作区并更新路径。
	5. 如果 roots 里发现了全新的工作区，则导入到 registry。
	6. registry 只维护按 `id` 索引的 metadata、locator、savedata；runtime 只维护按 `id` 索引的 open workspace handles。

### Workspace command split

- Rust API 目录位于 `rust/core/src/api/workspace/`，当前按职责拆为：
	- `workspace_registry_api.rs`
	- `workspace_runtime_api.rs`
- 当前 command key 也已经同步分组，不再继续共用单一 `workspace.*` 命名空间：
	- registry 侧命令使用 `workspace.registry.*`
	- runtime 侧命令使用 `workspace.runtime.*`
- 当前语义约定：
	- `workspace.registry.*` 负责 `init/setup/records/settings/savedata/roots/path checks`。
	- `workspace.runtime.*` 负责 `open/close/open-state/file tree/file node/reinit`。
- 如果未来新增 workspace command，优先先判断它是 registry 还是 runtime，再放到对应命名空间；不要再把两类职责重新混回 `workspace.*`。

### Current support boundary

- 当前版本实际保证的能力：
	- 桌面端绝对路径工作区。
	- Android app sandbox 容器下的工作区。
	- iOS app sandbox 容器下的工作区。
	- iOS shared container 的 best-effort roots 注册。
	- roots 重扫时按 `id` 自动迁移路径。
	- system default roots 与 future user-added roots 在模型上已支持按 source 分组管理。
- 当前版本不再兼容没有 `id` 的旧工作区目录，也不再兼容旧的路径键 savedata。
- 尚未实现但已预留：
	- iOS security-scoped bookmark 恢复。
	- Android SAF tree uri 恢复。
	- 基于 bookmark / tree uri 的真正非 `std::fs` 文件访问适配。
	- UI 层对多 roots 的完整管理界面。

## Build and Run

常用入口仍然是根目录脚本：

```bash
# Windows
run.cmd install
run.cmd dev

# Unix
sh run.sh install
sh run.sh dev
```

`run.cmd` / `run.sh` 实际会调用 `cli` 中的 Rust 运行器，命令定义以 `cli/run/config/run_config.toml` 为准。

当前已确认的常用命令包括：

- `dev`：桌面开发模式，底层执行 `cargo tauri dev`
- `dev:android`
- `dev:ios`
- `prebuild:android`
- `prebuild:ios`
- `build`
- `build:win`
- `build:mac:x64`
- `build:mac:arm64`
- `build:linux`
- `build:android`
- `build:ios`
- `icon`

- 开发、构建、prebuild 默认统一走根目录 `run.cmd` / `run.sh`；不要把 `ui/package.json`、`ui/rust/package.json` 里的原始命令当成团队默认入口。
- 只有在局部验证、排查单层问题或生成特定产物时，才直接在 `ui/`、`ui/rust/`、`ui/src-tauri/` 中执行原始 Bun / npm / Cargo 命令。
- Desktop/Web 调试入口是 Tauri 桌面客户端；不要把 `expo start --web`、`bun web` 或其他纯 Web dev server 当成当前项目的常规启动方式。

## Environment Requirements

- Rust nightly（根工程和 `ui/rust/` 都需要）
- Bun
- Node.js（用于 Expo / React Native 工具链）
- cargo-tauri CLI（桌面端 `dev` / `build` 命令依赖）
- Android 开发环境（Android Studio / SDK / NDK，按 Expo 和 Craby 需要配置）
- iOS 开发环境（Xcode，仅 macOS）
- Tauri 桌面构建依赖（按目标平台准备）

## Frontend Notes

- `ui/` 不是 Flutter 工程，当前是 React Native / Expo Router 架构。
- 当前基础 UI 包装层已经完成从 `heroui-native` 到 `Tamagui` 的迁移。
- 样式默认优先使用 `Tamagui` tokens / variants / style props，以及 React Native `StyleSheet`；唯一全局 CSS 入口仍是 `ui/src/global.css`。
- `ui/src/` 下的应用代码不要使用 CommonJS `require`；平台差异优先通过 `.web.tsx`、`.native.tsx`、`.ios.tsx`、`.android.tsx` 解决。
- `require` 仅保留在 Node 风格脚本与配置文件中，例如 `ui/tools/prebuild/`、`ui/metro.config.js`。
- 页面与业务组件不要直接依赖 `tamagui` 的基础组件或其他第三方 UI 库，统一通过 `ui/src/components/ui/` 包装层导入。
- 桌面端仍共享 React Native 代码，通过 Tauri 提供桌面壳与 Rust 能力。
- `ui/android/` 与 `ui/ios/` 是 Expo prebuild 后的原生工程输出；修改原生配置时要注意 prebuild 的覆盖关系。
- 如果只改移动端原生桥，不要误改 Tauri API；反之亦然。
- `ui/src/components/debug/ui_components_panel.tsx` 是基础 UI wrapper 的总览与回归面板，当前覆盖除 `provider` 与 `split_view` 外的全部 `ui/src/components/ui/` 组件。

### Frontend naming and file layout

- `ui/src/` 下的手写 TypeScript / TSX 文件默认统一使用 `snake_case` 文件名，例如 `workspace_session_store.ts`、`use_workspace_state.ts`。
- TypeScript 代码中的变量、函数、参数、普通对象字段统一使用小驼峰；React 组件、类型、interface、type alias 可继续使用 PascalCase。
- 常规例外仅包括框架约定文件与聚合文件，例如 `index.ts`、`index.tsx`、平台入口文件，以及框架/工具要求的生成文件。
- 手写 `.d.ts` 文件默认放在 `ui/src/types/`；当前允许的固定路径例外主要是 Expo 约定的 `ui/expo-env.d.ts` 这类无法自由迁移的文件。

### Frontend state management

- 全局状态、跨页面状态、跨组件共享状态统一放在 `ui/src/stores/` 中定义；当前项目默认使用 `zustand`，store 定义优先保持 `zustand/vanilla + hook wrapper` 这一现有模式。
- 组件局部状态、一次性 UI 交互状态、仅当前组件树需要的短生命周期状态，优先使用 React 原生 hooks，不要为了局部状态额外创建全局 store。
- 组件层消费共享状态时，优先经由 `ui/src/hooks/` 暴露的 hooks 访问，不要在业务组件中直接 import store 实例。
- 如果某个状态最终会被多个组件、多个页面或多个平台实现共享，先考虑补 hook，再决定是否新增 store；不要让业务组件各自复制一套订阅逻辑。

### Frontend API/common/platform rules

- `ui/src/api/commands/` 默认存放 Rust / Native command 的 TypeScript wrapper；只要某个能力已经或应该进入共享 Rust command 层，就让它和 `rust/core/src/api/` 中的暴露模块保持同步演进。
- `ui/src/api/commands/store/` 当前用于 UI / shell / appearance / desktop window 相关持久化状态；已经收口到这里的偏好包括主题模式、主题色、桌面缩放、窗口恢复开关与最近窗口几何状态。
- `ui/src/api/commands/settings/settings.ts` 与 Rust `rust/core/src/settings/mod.rs` 当前不再承担这些 UI 偏好；不要把 `themeMode`、`restoreWindowState`、`accentColor`、`zoomFactor` 或类似字段重新加回 business settings / Rust settings。
- `ui/src/api/common/` 用于纯 TypeScript 侧的公共逻辑、运行时适配、工具函数和平台抽象；不要把 Rust command wrapper 混放到这里。
- 平台判断逻辑统一通过 `ui/src/api/common/platform/` 暴露的接口完成，不要在业务代码里直接使用 React Native 自带的 `Platform`。
- 只有平台抽象实现层、invoke 底层、少量调试代码，才允许直接接触 `Platform` 或其他原始平台 API。
- 如果某个能力只支持桌面端 / Tauri，请尽量把平台判断和兜底行为焊在 API 底层，而不是把平台分支散落到页面和业务组件中。

### Frontend styling rules

- 项目允许使用 CSS 文件，但 TypeScript / TSX 侧唯一允许直接 import 的 CSS 入口是 `ui/src/global.css`；其他 CSS 必须通过 `global.css` 的 `@import` 链路间接纳入构建。
- 这是为了保持 Web/Desktop 全局样式入口单一，避免 CSS 入口分散；不要在业务 `.ts` / `.tsx` 文件里直接 import 其他 CSS。
- 简单样式、一次性样式、局部布局样式优先使用 `Tamagui` tokens / variants / style props，或 React Native `StyleSheet`。
- 当样式片段变得复杂、重复、难维护，或者需要抽出更稳定的 Web/Desktop 全局样式时，再考虑提取到 CSS 文件。
- 明显属于全局范畴的 CSS 优先放在 `ui/src/styles/`；局部 CSS 可以和对应 TS / TSX 文件放在一起，但仍需要通过某个已被 `global.css` 间接引入的 CSS 文件接入。

### Frontend component layering

- 所有基础组件、跨平台组件包装层、第三方 UI 组件适配层，都优先放在 `ui/src/components/ui/` 下统一封装后再给业务层使用。
- 业务组件不要直接依赖 `tamagui`、`@rn-primitives/*` 等第三方 UI 库；这些依赖应当收敛在 `ui/src/components/ui/`。
- 业务组件可以直接使用 `react-native` 的基础原语做布局与文本承载，例如 `View`、`Text`、`Pressable`；但按钮、对话框、菜单、输入框、浮层等可复用 UI 原语应优先走包装层。
- 由于项目同时面向移动端与 Tauri 桌面端，新增基础组件时优先从一开始就考虑 `.web.tsx` / `.native.tsx` 或更细平台拆分，而不是先写死单端实现。

### Frontend workspace command layer

- 前端 workspace command wrapper 当前位于 `ui/src/api/commands/workspace/`，并已按职责拆分：
	- `workspace_registry.ts`
	- `workspace_runtime.ts`
	- `types.ts`
- workspace 相关前端内存态与 hook 当前分别位于：
	- `ui/src/stores/workspace/`
	- `ui/src/hooks/workspace/`
- 当前前端约定：
	- `workspaceRegistry` 对应 `workspace.registry.*`。
	- `workspaceRuntime` 对应 `workspace.runtime.*`。
	- `workspaceSessionStore` 是前端内存态 session store，只维护 `currentWorkspaceId`，不承担持久化职责。
	- `workspaceEditorStore` 用于 editor 相关前端内存态；新增 editor 共享状态时优先延续这层分工，而不是塞回 command wrapper。
- `workspaceSessionStore` 当前提供：
	- `getCurrentWorkspaceId`
	- `requireCurrentWorkspaceId`
	- `setCurrentWorkspaceId`
	- `clearCurrentWorkspaceId`
	- `subscribe`
- 页面层如需消费 current workspace，优先通过 `ui/src/hooks/workspace/` 提供的 `useWorkspaceSession()` / `useCurrentWorkspaceId()`，而不是在业务组件里直接手写 `subscribe`。
- 当前 `workspaceRuntime.open()` / `workspaceRuntime.close()` 会自动维护 `workspaceSessionStore` 的 current workspace。
- `workspaceRuntime.open()` 与 `workspaceRuntime.getState()` 当前都返回同一份完整 `WorkspaceState` 结构，包含 `record/settings/runtimeConfig/runtimeStatus`，前端不需要再区分“刚打开”和“已打开查询”两种结构。
- 当前首页已经接入 `WorkspaceDebugPanel`，可直接查看 roots、手动 sync summary、registry records，以及 current workspace 的 runtime state。
- 如果后续要做自动恢复、最近工作区恢复、跨重启记忆，不要把这些逻辑塞进 `workspaceSessionStore`；应当走 `settings + workspace.registry.get_last_workspace_id()` 这条持久化链路。

## Rust Command Integration Notes

### Shared command layer

- `rust/core/` 是共享 command 的权威来源。
- `lonanote_core::init()` 负责注册 command，运行时侧通常只做薄封装。
- 大部分 Rust 命令如果能在 `rust/core/src/api/` 中实现，就不要下沉到 `ui/src-tauri/src/commands/`；优先减少对 Tauri runtime 的直接依赖。
- `ui/src/api/commands/` 中面向业务层暴露的 wrapper，也应优先对应共享 Rust API；只有明确和 Tauri 窗口、WebView、桌面壳能力强耦合的命令，才保留在 Tauri 专属层。
- `workspace` 相关 command 当前已经按 registry/runtime 分组；修改这组命令时，要同时检查：
	- Rust command namespace 是否仍然符合 `workspace.registry.*` / `workspace.runtime.*`
	- 前端 wrapper 是否同步更新了 invoke key
	- Native startup 里是否仍然调用正确的 registry 命令
- 优先保持 Tauri 与 React Native 桥接层的 API 形状一致：
	- `invoke`
	- `getCommandKeys`
	- `getCommandLength`
	- `invokeAsync`
	- `getCommandAsyncKeys`
	- `getCommandAsyncLength`
	- callback 相关 API

### Tauri side

- 桌面端桥接位于 `ui/src-tauri/src/commands/`。
- 当前 `invoke.rs` 会将 command 名放在 header `key` 中，把 `args` 作为 JSON body 中的字符串传给 Rust core。
- 这意味着 command key 本身只是普通字符串透传；只要前后端一致，`workspace.registry.*` / `workspace.runtime.*` 这类分组 key 可以直接工作。
- 当前明确属于 Tauri 强耦合例外的能力，典型如 `win.*` 这类窗口 API；这种能力在 TypeScript 侧也必须明确限定仅桌面端可用，不支持移动端。
- 如果前端直接使用 Tauri `window` / `webview` API，例如 `setPosition`、`setSize`、`setFullscreen`、`setZoom`，必须同步检查 `ui/src-tauri/capabilities/*.json` 是否已声明对应 permission；当前桌面窗口恢复与桌面缩放至少依赖：
	- `core:window:allow-set-position`
	- `core:window:allow-set-size`
	- `core:window:allow-set-fullscreen`
	- `core:webview:allow-set-webview-zoom`
- 如果未来新增 Tauri 专属命令，优先保持它们集中在单独 namespace，并在调用侧通过 `ui/src/api/common/platform/` 或 API 底层显式处理平台限制。

### Craby side

- React Native 原生模块位于 `ui/rust/`。
- TS spec 位于 `ui/rust/src/NativeLonanoteRustModule.ts`。
- 运行 `crabygen` 后会生成或刷新：
	- `ui/rust/crates/lib/src/generated.rs`
	- `ui/rust/crates/lib/src/ffi.rs`
	- `ui/rust/cpp/*` 中的桥接代码
- Rust 具体实现位于 `ui/rust/crates/lib/src/lonanote_rust_module_impl.rs`。
- `ui/rust/` 的职责是 React Native 到 Rust 的绑定桥，默认不要在这里扩散业务逻辑；如果只是为了接入移动端原生能力，优先先评估是否应通过 Expo config plugin / Expo 原生能力解决。

## Craby Caveats

这是当前仓库里已经踩过且需要明确记住的一点：

- 当 Craby spec 中存在 `Promise<string | null>` 这类返回类型时，当前生成的 Rust `ffi.rs` 异步 wrapper 可能少一次 nullable 转换。
- 在本仓库里，`lonanote_rust_module_invoke_async` 需要保留类似 `.and_then(|r| r).map(Into::into)` 的收口。
- 如果重新运行 `crabygen` 覆盖了 `ui/rust/crates/lib/src/ffi.rs`，务必复查这个点，否则会出现 Rust 编译类型不匹配。

换句话说：`ui/rust/crates/lib/src/ffi.rs` 虽然是生成文件，但当前存在已知生成器缺口，重新生成后不能盲信，需要人工复核。

## Callback Bridge Notes

- Tauri 侧 callback 通过窗口事件往返。
- React Native / Craby 侧 callback 通过 signal + request id + resolve/reject 回写实现。
- 如果修改 callback 协议，要同时更新：
	- `ui/src/api/invoke/invoke.ts`
	- `ui/src/api/invoke/invoke.native.ts`
	- `ui/rust/src/NativeLonanoteRustModule.ts`
	- `ui/rust/crates/lib/src/lonanote_rust_module_impl.rs`

## Generated Files Policy

- 默认不要手改生成文件，除非确认是生成器缺口或构建链限制。
- 当前已知“允许且需要人工复核”的生成文件主要是 `ui/rust/crates/lib/src/ffi.rs`。
- 若因生成器缺口手改了生成文件，应在提交说明和相关文档中明确写出原因。

## Validation Checklist

涉及不同层的改动时，优先做对应范围的验证：

### Tauri / shared Rust

```bash
cargo check
```

或至少验证相关 crate。

### Rust command-level integration tests

```bash
cargo test -p lonanote-core --test workspace_api_commands -- --nocapture
```

补充说明：

- `rust/core/tests/workspace_api_commands/` 这组 async 测试当前需要通过 `support.rs` 中的 `spawn_blocking` 初始化命令注册。
- 原因是 `cmdreg` 的 async command 注册会自行创建 tokio runtime；不要在 `#[tokio::test]` 中直接同步调用 `init()`，否则容易触发 nested runtime panic。

### React Native app

```bash
cd ui
bun lint
```

需要时再跑 `bun android` / `bun ios` / Expo 相关命令。

### Craby module

```bash
cd ui/rust
npm run generate   # 修改了 Native spec 时
cargo check -p lonanote_rust_module
npm run typecheck
npm run lint
```

如果 `cargo check` 失败，先确认当前 toolchain 是否为 nightly。

## Commit Convention

- 提交信息使用 gitmoji 前缀。
- 参考 [docs/dev/commit_emoji.md](docs/dev/commit_emoji.md)。
- 常见示例：`✨ feat: ...`、`🐛 fix: ...`、`♻️ refactor: ...`、`📝 docs: ...`。

## Practical Editing Guidance

- 修改 command 行为时，优先修根因，避免只在某一个运行时做特例补丁。
- 修改 `ui/rust/src/NativeLonanoteRustModule.ts` 后，通常需要重新跑 `npm run generate`。
- 修改 `rust/core/` 的 command 签名、参数或返回值后，必须检查 Tauri 和 Craby 两侧桥接是否同步。
- 桌面与移动端共用前端 invoke 抽象，新增 API 时优先保持命名与返回类型一致。
- 新增或重构 workspace 相关 API 时，先判断它属于 registry、runtime、还是前端 session，再决定它应该落在哪一层；不要重新引入“大而全”的 workspace manager。
- 前端新增 UI 组件时，优先放到 `ui/src/components/ui/<component>/` 包装层，并拆分 `*.web.tsx` / `*.native.tsx`，不要让业务层直接 import 第三方 UI 库。
- 新增对话框、Popover、DropdownMenu、ContextMenu 这类高风险浮层组件时，优先保持项目内统一 API，并在 `ui/src/components/ui/` 内以 `Tamagui` 为基础处理跨平台差异；只有出现明确能力缺口时才局部引入平台特化实现。
- 对于 Expo Router 的 `ui/src/app/` 路由文件，如需平台拆分，必须保留非平台基础文件，再额外提供 `.web.tsx` 或其他平台文件。
- 不要把旧 Flutter / flutter_rust_bridge 时代的约定继续写入新代码或新文档。
