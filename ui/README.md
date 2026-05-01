### 开发说明

#### 🔨 开发环境

- [Rust](https://rustup.rs/) >= 1.94.0-nightly
- Android 和 IOS 开发环境

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

# macos x64
run build:mac:x64
# or
sh run.sh build:mac:x64

# macos arm64
run build:mac:arm64
# or
sh run.sh build:mac:arm64

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

#### generate icon

```
# generate icon
run.cmd icon
# or
sh run.sh icon
```

#### 🎨 提交

[commit_emoji](../docs/dev/commit_emoji.md)
