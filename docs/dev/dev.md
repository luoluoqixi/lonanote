# 开发说明

## 修改依赖 patch

修改或重新生成任何依赖 patch 前，必须先阅读
[Bun patch：同一文件多个 diff 块的产出与验证](../patch/bun_same_file_hunk_offset.md)。
必须保持最小改动、不影响旧 patch 的行为，并在修改完成后进行完整 patch 的 diff review；
具体产出流程与验证要求以该文档为准。
