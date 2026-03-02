### 开发说明

#### 🔨 开发环境

- [Rust](https://rustup.rs/) >= 1.85.0-nightly
- [Flutter](https://docs.flutter.dev/get-started/install) >= 3.38.9
- Android 和 IOS 环境配置参考 Flutter 文档
- VSCode 中保存 dart 时长时间无法保存
  - [#60335](https://github.com/dart-lang/sdk/issues/60335)

#### 🚀 安装

```shell
run.cmd install
# or
sh run.sh install
```

#### 🧑‍💻 运行

```shell
run.cmd dev
# or
sh run.sh dev
```

> 首次运行应用程序时会被阻止
>
> 转到手机 Settings > Privacy & Security > Developer Mode 以启用开发者模式
>
> 然后转到 Settings -> General -> VPN and device management -> From "Developer App"
>
> 按 "Apple Development: APPLE_ID"->"信任"

#### 🏗 打包

```shell
# windows
run build:win
# or
sh run.sh build:win

# macos
run build:mac
# or
sh run.sh build:mac

# linux
run build:linux
# or
sh run.sh build:linux

# android
run build:android
# or
sh run.sh build:android

# ios
run build:ios
# or
sh run.sh build:ios
```

#### 🧑‍💻 打包 & 运行

```shell
run.cmd preview
# or
sh run.sh preview
```

### generate

#### generate rust code

```
# install flutter_rust_bridge_codegen
cargo install flutter_rust_bridge_codegen

# generate rust code
cd ui
flutter_rust_bridge_codegen generate

# or
run.cmd gen:rust
# or
sh run.sh gen:rust
```

#### generate dart code

```
# generate dart
cd ui
dart run build_runner build

# or
run.cmd gen:dart
# or
sh run.sh gen:dart
```

#### generate icon

```
# generate icon
run.cmd icon
# or
sh run.sh icon
```

#### 🎨 提交

[commit_emoji](../docs/dev/commit_emoji.md)
