### 开发说明

#### 🔨 开发环境

- [Rust](https://rustup.rs/) >= 1.94.0-nightly
- Node.js >= 22
- Android 开发环境
  - Android SDK 36
  - buildTools 36.0.0
  - ndkVersion 27.1.12297006
  - java 17
- iOS 开发环境
  - Xcode 26.2
  - CocoaPods 1.16.2
  - Ruby 3.2

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


#### 其他

Windows 长路径限制:

1. 右键管理员运行 PowerShell, 移除路径长度限制（从 Windows 10 版本 1607 开始）：

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
-Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

2. 运行 gpedit.msc，依次展开：计算机配置 > 管理模板 > 系统 > 文件系统，启用 "启用 Win32 长路径" 选项。



#### 🎨 提交

[commit_emoji](../docs/dev/commit_emoji.md)
