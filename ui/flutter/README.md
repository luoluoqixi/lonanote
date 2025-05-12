# LonaNote Flutter

### run

```
cd ui
flutter run
```

### build

```
cd ui/flutter
flutter build apk --release
flutter build ios --release
```

### generate

```
# generate code
cargo install flutter_rust_bridge_codegen

cd ui/flutter
flutter_rust_bridge_codegen generate
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
