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

`run.cmd` 实际会调用 `cli` 中的 Rust 运行器。

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
- Android 开发环境（Android Studio / SDK / NDK，按 Expo 和 Craby 需要配置）
- iOS 开发环境（Xcode，仅 macOS）
- Tauri 桌面构建依赖（按目标平台准备）

## Frontend Notes

- `ui/` 不是 Flutter 工程，当前是 React Native / Expo Router 架构。
- 样式体系可见 `global.css`、`uniwind`、`tailwind-variants`、`heroui-native` 等依赖。
- 桌面端仍共享 React Native 代码，通过 Tauri 提供桌面壳与 Rust 能力。
- 如果只改移动端原生桥，不要误改 Tauri API；反之亦然。

## Rust Command Integration Notes

### Shared command layer

- `rust/core/` 是共享 command 的权威来源。
- `lonanote_core::init()` 负责注册 command，运行时侧通常只做薄封装。
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
- 不要把旧 Flutter / flutter_rust_bridge 时代的约定继续写入新代码或新文档。
