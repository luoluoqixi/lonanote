### 开发说明

#### 🔨 开发环境

- Windows / Mac / Linux
  - [Rust](https://rustup.rs/) >= 1.85.0-nightly
  - [Node](https://nodejs.org/) >= 20
  - [pnpm](https://pnpm.io/) >= 9.15.0
  - [NuGet](https://dist.nuget.org/win-x86-commandline/latest/nuget.exe)
- Android / IOS
  - [Flutter](https://docs.flutter.dev/get-started/install) >= 3.32.1
  - Android 和 IOS 环境配置参考 Flutter 文档
  - VSCode 中保存 dart 时长时间无法保存
    - [#60335](https://github.com/dart-lang/sdk/issues/60335)
- [flutter 相关文档](./flutter/README.md)


#### 🚀 安装 pnpm

```shell
.\run.cmd install
```

#### 🧑‍💻 运行 Windows / Mac / Linux

```shell
.\run.cmd dev
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
# build && 运行
.\run.cmd build:run

# windows
.\run.cmd build:win

# macos
.\run.cmd build:mac

# linux
.\run.cmd build:linux

# android
.\run.cmd build:android

# ios
.\run.cmd build:ios
```

#### 🎨 提交

[commit_emoji](../docs/dev/commit_emoji.md)
