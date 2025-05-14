### 开发说明

#### 开发环境

- Windows / Mac / Linux
  - [Rust](https://rustup.rs/) >= 1.85.0-nightly
  - [Node](https://nodejs.org/) >= 20
  - [pnpm](https://pnpm.io/) >= 9.15.0
- Android / IOS
  - [Flutter](https://docs.flutter.dev/get-started/install) >= 3.29.3
  - Android 和 IOS 环境配置参考 Flutter 文档

#### 安装

```shell
pnpm -C ui install
```

#### 运行 Windows / Mac / Linux

```shell
pnpm -C ui dev
```

#### 打包

```shell
# windows
pnpm -C ui build:win

# macos
pnpm -C ui build:mac

# linux
pnpm -C ui build:linux

# android
cd ui/flutter
flutter build apk --release

# ios
cd ui/flutter
flutter build ios --release
```

#### 运行 Android / IOS

- 运行 Android

```shell
# 提前使用 USB 连接真机或启动 Android 模拟器
cd ui/flutter
flutter run
```

- 运行 IOS

```shell
# 提前使用 USB 连接真机或启动 IOS 模拟器
cd ui/flutter
flutter run
```

> 首次运行应用程序时会被阻止
>
> 转到手机 Settings > Privacy & Security > Developer Mode以启用开发者模式
>
> 然后转到 Settings -> General -> VPN and device management -> From "Developer App"
>
> 按 "Apple Development: APPLE_ID"->"信任"

#### 提交

[commit_emoji](./commit_emoji.md)
