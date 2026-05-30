### 开发说明

#### 🔨 开发环境

- [Rust](https://rustup.rs/) >= 1.94.0-nightly
  - `cargo install tauri-cli --version ^2.1.0 --locked` 桌面开发需要
- [Bun](https://bun.sh/) ^1.3.13
- [Node.js](https://nodejs.org/) >= 22
- Android 开发环境
  - Android Studio Windows 平台目前使用 2025.3.3 测试, 建议使用此版本或更高版本
  - 更具体 SDK 版本可查看 [sdk_config.txt](./sdk_config.txt)
  - Android SDK == 36
  - buildTools == 36.0.0
  - ndkVersion == 27.1.12297006
  - java >= 17  Windows 平台使用 Android Studio 内置的 JBR（java 21.0.10） 测试通过, MacOS使用 openjdk 17 测试通过
  - ANDROID_SDK_ROOT 环境变量指向 Android SDK 安装路径
  - JAVA_HOME Android Studio 安装路径下的 jbr 目录，例如 `C:\Program Files\Android\Android Studio\jbr`
  - `rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android`
- iOS 开发环境
  - Xcode >= 26.2
  - CocoaPods >= 1.16.2
  - Ruby >= 3.2

#### 🚀 安装

```shell
run.cmd install
# or
sh run.sh install

```

根目录脚本会读取 [cli/run/config/run_config.toml](../cli/run/config/run_config.toml) 中定义的命令。

#### 🧑‍💻 运行

```shell
run.cmd dev
# or
sh run.sh dev
```

移动端开发：

```shell
run.cmd dev:android
run.cmd dev:ios
# or
sh run.sh dev:android
sh run.sh dev:ios
```

`ui/android/` 与 `ui/ios/` 是 Expo prebuild 生成的原生工程；需要刷新原生工程时可运行：

```shell
run.cmd prebuild:android
run.cmd prebuild:ios
# or
sh run.sh prebuild:android
sh run.sh prebuild:ios
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
run.cmd build:win
# or
sh run.sh build:win

# macos x64
run.cmd build:mac:x64
# or
sh run.sh build:mac:x64

# macos arm64
run.cmd build:mac:arm64
# or
sh run.sh build:mac:arm64

# linux
run.cmd build:linux
# or
sh run.sh build:linux

# android
run.cmd build:android
# or
sh run.sh build:android

# ios
run.cmd build:ios
# or
sh run.sh build:ios
```

#### generate icon

```
# generate icon
run.cmd icon
# or
sh run.sh icon
```

#### 🎨 跨平台 UI 约定

前端以 `Tamagui` 作为全局主题和主要 UI 基础，页面层通过 `ui/src/components/ui/` 包装层接入，不要直接依赖第三方 UI 库。

- Android / iOS / Web / 桌面：布局与主题优先使用 `Tamagui` tokens、`StyleSheet`，或 `ui/src/components/ui/` 中的包装组件
- 桌面 / Web 端个别高风险浮层可在包装层内按需使用 `@rn-primitives/*` 补位

当前全局样式入口：

- `src/tamagui.generated.css`：由 `@tamagui/cli generate` 生成，在 `src/initialize/index.native.ts` 中引入

因此，不要再在业务代码里使用 `className` + Tailwind / Uniwind，也不要重新引入第二套全局主题 CSS。

关于模块系统：

- `ui/src/` 下的应用代码不要使用 CommonJS `require`
- 平台分发优先使用 `*.web.tsx`、`*.native.tsx`、`*.ios.tsx`、`*.android.tsx`
- 允许使用 `require` 的位置仅限 Node 风格脚本和配置文件，例如 `ui/tools/prebuild/`、`metro.config.js`

组件接入规则：

- 页面和业务组件统一从 `src/components/ui/` 导入
- 平台差异放在 `*.native.tsx` / `*.web.tsx` 包装文件里
- 对外暴露稳定的项目内 API，不把第三方库的 props 直接扩散到业务层
- `@rn-primitives/*` 仅用于 dialog、popover、dropdown-menu 这类局部 Web / 桌面补位，不作为第二套全局设计系统

当前已经提供的包装层示例：

- `src/components/ui/provider/`：统一应用级 Provider
- `src/components/ui/button/`：统一 Button 入口
- `src/components/ui/dialog/`：统一 Dialog 入口，web 走 `@rn-primitives/dialog`，native 走项目内包装实现

后续如果要新增 `Input`、`Modal`、`Dropdown` 等组件，沿用同样结构：

```text
src/components/ui/input/
  input.native.tsx
  input.web.tsx
  index.ts
  types.ts
```

这样做的目的：

- 避免业务层直接绑定第三方 UI 库
- 把 Web / Native 的差异限制在包装层内部
- 后续替换 UI 库或调整 props 映射时，影响面只停留在包装层


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
