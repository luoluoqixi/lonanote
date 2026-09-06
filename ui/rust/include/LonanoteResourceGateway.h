#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * 返回 workspace 的 opaque resource scope JSON；未初始化、workspace 无效或未打开时返回 NULL。
 * 调用 lonanote_resource_free_string 释放返回值。
 */
char *lonanote_resource_acquire_scope(const char *workspace_id);

/** 返回资源响应 metadata JSON；调用 lonanote_resource_free_string 释放返回值。 */
char *lonanote_resource_open(const char *request_json);

/** 返回 1=chunk、0=EOF、-1=读取错误、-2=handle 不存在。 */
int32_t lonanote_resource_read_next(uint64_t handle_id, uint8_t **out_bytes, size_t *out_length);

/** 取消后续读取并释放 stream。 */
void lonanote_resource_close(uint64_t handle_id);

void lonanote_resource_free_string(char *value);
void lonanote_resource_free_bytes(uint8_t *bytes, size_t length);

#ifdef __cplusplus
}
#endif
