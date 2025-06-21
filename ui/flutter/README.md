# LonaNote Flutter

### generate

```
# generate code
cargo install flutter_rust_bridge_codegen

cd ui/flutter
flutter_rust_bridge_codegen generate

# generate other dart
dart run build_runner build
```

### install project

```
cd ui/flutter
flutter packages get

cd ui/flutter/rust_builder
flutter packages get

cd ui/flutter/rust_builder/cargokit/build_tool
flutter packages get
```

### Run

```
# 以下为手动操作, 建议使用 pnpm -C ui dev:mobile 自动运行

cd ui/packages/mobile-editor
pnpm dev

cd ui
flutter run
```

### Build

```
# 以下为手动操作, 建议使用 pnpm -C ui build:android/ios 自动运行

cd ui/packages/mobile-editor
pnpm build

cd ui/flutter
flutter build apk --release
flutter build ios --release
```
