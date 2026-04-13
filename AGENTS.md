# Project Guidelines

## Overview

LonaNote (露娜笔记) is a cross-platform, local-first Markdown note-taking app. Notes are stored as plain files on the filesystem—no database. Supports Windows, macOS, Linux, Android, and iOS.

## Tech Stack

- **UI**: Flutter (Dart) with Hooks Riverpod for state management
- **Core**: Rust — workspace operations, file I/O, config management
- **Editor**: WebView-based WYSIWYG Markdown editor (TypeScript, embedded in `ui/assets/editor/`)
- **FFI**: flutter_rust_bridge connects Dart ↔ Rust

## Architecture

| Directory | Purpose |
|-----------|---------|
| `ui/` | Flutter app — views, providers, widgets, theme, localization |
| `rust/core/` | Rust crate `lonanote-core` — workspace, config, settings, file utilities |
| `rust/commands/` | Rust crate `lonanote-commands` — command handler system (context, body, result) |
| `cli/` | Build/dev CLI tools — install, dev, build, release, codegen |
| `ui/assets/editor/` | TypeScript-based editor (Vite + ESLint) embedded in WebView |
| `docs/` | Developer documentation |

## Build and Run

```bash
# Windows
run.cmd install      # Install dependencies
run.cmd dev          # Run development build

# Unix
sh run.sh install
sh run.sh dev
```

Other CLI commands: `preview`, `build:win`, `build:mac`, `build:linux`, `build:android`, `build:ios`, `gen:rust`, `gen:dart`, `icon`, `release`.

Requires: Rust >= 1.85.0-nightly, Flutter >= 3.38.9.

## Code Style

### Dart (Flutter)
- State management: `hooks_riverpod` + `flutter_hooks`. Use `ConsumerStatefulWidget` / `HookConsumerWidget`.
- Code generation: `freezed` + `json_serializable` for models. Run `run.cmd gen:dart` after modifying annotated classes.
- Responsive layout: `MediaQuery` + `Offstage` + `Stack` pattern for preserving widget state across breakpoints. Do NOT use conditional `if` in Stack children—always keep children at fixed indices.

### Rust
- Two workspace crates under `rust/`: `core` and `commands`. Both use `lib.rs` as module root.
- Run `run.cmd gen:rust` after modifying Rust API signatures.

### TypeScript (Editor)
- Located in `ui/assets/editor/`. Uses Vite, ESLint, pnpm.
- Communicates with Dart via WebView JS bridge (`window.initEditor()`, `window.getContent()`).

## Conventions

- **Commits**: Use [gitmoji](https://gitmoji.dev/) prefix. See `docs/dev/commit_emoji.md` for full list. Examples: `✨ feat: ...`, `🐛 fix: ...`, `♻️ refactor: ...`.
- **Providers**: Auto-dispose by default. If a provider must stay alive, ensure a persistent widget watches it.
- **WebView state**: Never recreate WebView widgets on layout changes. Use `GlobalKey` + `didUpdateWidget` to update content in place.
- **Platform pages**: Use `PlatformSimplePage` / `PlatformPage` wrappers for consistent cross-platform AppBar behavior.

## Testing

- Flutter integration tests: `ui/integration_test/`
- Run: `cd ui && flutter test integration_test/`
