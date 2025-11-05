# LonaNote Flutter

### generate

#### generate rust code
```
# install
cargo install flutter_rust_bridge_codegen

# generate rust
cd ui/flutter
flutter_rust_bridge_codegen generate

# or
run.cmd gen:rust
# or
sh run.sh gen:rust
```

#### generate dart code

```
# generate dart
cd ui/flutter
dart run build_runner build

# or
run.cmd gen:dart
# or
sh run.sh gen:dart
```

### install project

```
cd ui/flutter
flutter packages get

cd ui/flutter/rust_builder
flutter packages get

cd ui/flutter/rust_builder/cargokit/build_tool
flutter packages get

# or
run.cmd install
# or
sh run.sh install
```
