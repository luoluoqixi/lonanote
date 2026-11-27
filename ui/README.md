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
# chmod +x run
run install

```

根目录脚本会读取 [cli/run/config/run_config.toml](../cli/run/config/run_config.toml) 中定义的命令。

#### 🧑‍💻 运行

```shell
run.cmd dev
# or
run dev
```

移动端开发：

```shell
run.cmd dev:android
run.cmd dev:ios
# or
run dev:android
run dev:ios
```

`ui/android/` 与 `ui/ios/` 是 Expo prebuild 生成的原生工程；需要刷新原生工程时可运行：

```shell
run.cmd prebuild:android
run.cmd prebuild:ios
# or
run prebuild:android
run prebuild:ios
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
run build:win

# macos x64
run.cmd build:mac:x64
# or
run build:mac:x64

# macos arm64
run.cmd build:mac:arm64
# or
run build:mac:arm64

# linux
run.cmd build:linux
# or
run build:linux

# android
run.cmd build:android
# or
run build:android

# ios
run.cmd build:ios
# or
run build:ios
```

#### generate icon

```
# generate icon
run.cmd icon
# or
run icon
```

#### 🎨 跨平台 UI 约定

前端统一消费独立仓库的 `rn-ui-kit` 2.0。库内 Web 使用 HeroUI React，iOS / Android 使用 HeroUI Native，并保留系统原生控件、NativeList、NativeTrigger 和 TrueSheet 分支。

- 页面和业务组件直接从 `rn-ui-kit` 导入；不要恢复 `src/components/ui/` 包装层，也不要直接导入底层 HeroUI 组件。
- 通用基础组件在同级 `rn_ui_kit/src/core/components/ui/` 维护；LonaNote 业务组合留在 `src/components/`。
- 简单样式使用语义颜色和 Uniwind `className`，复杂布局使用 React Native `StyleSheet`。
- 主操作色为 `accent`，弱文字为 `muted`，轻染背景使用 `accent-soft` utility 或 `accent03` 色阶。背景独立于强调色；保留浅色、深色与跟随系统模式。
- 基础组件回归入口为 `src/app/debug.tsx`，通过 `rn-ui-kit/debug` 加载示例。

样式与 Metro 接入：

- 应用仍只引入 `global.css`。Web 通过 PostCSS 加载 Tailwind、`@heroui/styles` 和 `rn-ui-kit/styles.css`。
- `metro.config.js` 使用 `rn-ui-kit/metro` 的 `withHeroUIConfig`，为 iOS / Android 映射到 `global.native.css`，由 Uniwind 加载 `heroui-native/styles`。
- 两个平台的 CSS 入口分别维护，避免在 Web 加载 Native 样式或在 Native 加载 Web 样式。
- 当前 `rn-ui-kit` 固定到包含 Metro 助手的 2.0.0 提交 `04225868765f52aaf7ea1045532ee221fb391d08`，通过 Bun 锁文件和 `rn-ui-kit@2.0.0.patch` 保持可复现安装；本地开发可临时使用 `file:../../rn_ui_kit`。
- 升级 TrueSheet、Reanimated 等原生依赖后，需要重新构建 iOS / Android 应用。

关于模块系统：

- `ui/src/` 下的应用代码不要使用 CommonJS `require`
- 平台分发优先使用 `*.web.tsx`、`*.native.tsx`、`*.ios.tsx`、`*.android.tsx`
- 允许使用 `require` 的位置仅限 Node 风格脚本和配置文件，例如 `ui/tools/prebuild/`、`metro.config.js`

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
