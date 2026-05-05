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
- `WorkspaceInstance` 不再持有完整 `WorkspaceSettings`；运行时只保留：
	- `workspace_id`
	- `workspace_path`
	- `runtime_config`
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
- 当前版本不再兼容没有 `id` 的旧工作区目录，也不再兼容旧的路径键 savedata。
- 尚未实现但已预留：
	- iOS security-scoped bookmark 恢复。
	- Android SAF tree uri 恢复。
	- 基于 bookmark / tree uri 的真正非 `std::fs` 文件访问适配。
	- UI 层对多 roots 的完整管理界面。

### Follow-up guidance

- 后续优先级建议：
	1. 在原生层确认 iOS shared container 的实际来源，并明确区分本地容器与云容器。
	2. 给 roots 配置增加持久化来源信息，区分系统默认 roots 和用户显式授权 roots。
	3. 真正接入 `IosBookmark` 和 `AndroidTreeUri` 的解析与恢复逻辑。
	4. UI 层新增 workspace root 调试面板，直接展示当前 roots 和同步结果。

### Suggested optimization roadmap

- 建议后续按以下顺序继续优化：
	1. 给 `workspaceSession` 再包一层 React hook，把 `subscribe` 封装成稳定的页面级消费接口，避免业务组件直接操作 session store。
	2. 给 roots 增加来源元数据持久化，明确区分系统默认 roots、用户手动添加 roots、未来 bookmark / tree uri roots，避免后续恢复逻辑继续膨胀。
	3. 在 runtime 层补一套更明确的生命周期状态或事件，例如 `opening`、`opened`、`reinitializing`、`closing`，让前端加载态、错误态、重试逻辑更清晰。
	4. 再收敛一轮 registry / runtime 的返回结构，尽量减少前端需要分别拉 `record`、`settings`、`runtimeConfig` 后再自行拼装的场景。
	5. 在 UI 侧补一个 roots / runtime 调试面板，把当前 roots、同步结果、导入数量、重定位数量、current workspace 状态直接展示出来，降低后续移动端路径与工作区状态问题的排查成本。

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
- 样式体系以 `uniwind` 为统一 Tailwind 层，唯一全局样式入口是 `ui/src/global.css`。
- 全局主题与主要 UI 组件统一基于 `heroui-native`；不要再引入 `@heroui/react`、`@heroui/styles` 这套 Web 主题入口。
- 若桌面 / Web 侧个别弹出层、菜单、浮层原语存在能力缺口，可在 `ui/src/components/ui/` 包装层内按需使用 `@rn-primitives/*`，但只用于局部补位，不作为第二套全局设计系统。
- `ui/src/` 下的应用代码不要使用 CommonJS `require`；平台差异优先通过 `.web.tsx`、`.native.tsx`、`.ios.tsx`、`.android.tsx` 解决。
- `require` 仅保留在 Node 风格脚本与配置文件中，例如 `ui/tools/prebuild/`、`ui/metro.config.js`。
- 页面与业务组件不要直接依赖 `heroui-native` 或 `@rn-primitives/*`，统一通过 `ui/src/components/ui/` 包装层导入。
- 桌面端仍共享 React Native 代码，通过 Tauri 提供桌面壳与 Rust 能力。
- `ui/android/` 与 `ui/ios/` 是 Expo prebuild 后的原生工程输出；修改原生配置时要注意 prebuild 的覆盖关系。
- 如果只改移动端原生桥，不要误改 Tauri API；反之亦然。

### Frontend workspace command layer

- 前端 workspace command wrapper 当前位于 `ui/src/api/commands/workspace/`，并已按职责拆分：
	- `workspaceRegistry.ts`
	- `workspaceRuntime.ts`
	- `workspaceSession.ts`
	- `types.ts`
- 当前前端约定：
	- `workspaceRegistry` 对应 `workspace.registry.*`。
	- `workspaceRuntime` 对应 `workspace.runtime.*`。
	- `workspaceSession` 是前端内存态 session store，只维护 `currentWorkspaceId`，不承担持久化职责。
- `workspaceSession` 当前提供：
	- `getCurrentWorkspaceId`
	- `requireCurrentWorkspaceId`
	- `setCurrentWorkspaceId`
	- `clearCurrentWorkspaceId`
	- `subscribe`
- 当前 `workspaceRuntime.open()` / `workspaceRuntime.close()` 会自动维护 `workspaceSession` 的 current workspace。
- 如果后续要做自动恢复、最近工作区恢复、跨重启记忆，不要把这些逻辑塞进 `workspaceSession`；应当走 `settings + workspace.registry.get_last_workspace_id()` 这条持久化链路。

## Rust Command Integration Notes

### Shared command layer

- `rust/core/` 是共享 command 的权威来源。
- `lonanote_core::init()` 负责注册 command，运行时侧通常只做薄封装。
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

### Craby side

- React Native 原生模块位于 `ui/rust/`。
- TS spec 位于 `ui/rust/src/NativeLonanoteRustModule.ts`。
- 运行 `crabygen` 后会生成或刷新：
	- `ui/rust/crates/lib/src/generated.rs`
	- `ui/rust/crates/lib/src/ffi.rs`
	- `ui/rust/cpp/*` 中的桥接代码
- Rust 具体实现位于 `ui/rust/crates/lib/src/lonanote_rust_module_impl.rs`。

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
- 新增对话框、Popover、DropdownMenu、ContextMenu 这类高风险浮层组件时，优先保持项目内统一 API，再在 `.web.tsx` 中按需接 `@rn-primitives/*`，`.native.tsx` 中优先复用 `heroui-native`。
- 对于 Expo Router 的 `ui/src/app/` 路由文件，如需平台拆分，必须保留非平台基础文件，再额外提供 `.web.tsx` 或其他平台文件。
- 不要把旧 Flutter / flutter_rust_bridge 时代的约定继续写入新代码或新文档。
