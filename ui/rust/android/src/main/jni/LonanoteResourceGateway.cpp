#include <jni.h>

#include <climits>
#include <string>

#include "LonanoteResourceGateway.h"

namespace {

std::string toStdString(JNIEnv *env, jstring value) {
  if (value == nullptr) {
    return {};
  }
  const char *chars = env->GetStringUTFChars(value, nullptr);
  if (chars == nullptr) {
    return {};
  }
  std::string result(chars);
  env->ReleaseStringUTFChars(value, chars);
  return result;
}

void throwIOException(JNIEnv *env, const char *message) {
  jclass exceptionClass = env->FindClass("java/io/IOException");
  if (exceptionClass != nullptr) {
    env->ThrowNew(exceptionClass, message);
  }
}

}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_rs_craby_lonanoterustmodule_LonanoteResourceGateway_nativeOpen(
    JNIEnv *env,
    jclass,
    jstring request_json) {
  std::string request = toStdString(env, request_json);
  if (request.empty()) {
    return nullptr;
  }
  char *response = lonanote_resource_open(request.c_str());
  if (response == nullptr) {
    return nullptr;
  }
  jstring result = env->NewStringUTF(response);
  lonanote_resource_free_string(response);
  return result;
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_rs_craby_lonanoterustmodule_LonanoteResourceGateway_nativeReadNext(
    JNIEnv *env,
    jclass,
    jlong handle_id) {
  if (handle_id <= 0) {
    throwIOException(env, "无效的 Workspace resource handle");
    return nullptr;
  }

  uint8_t *bytes = nullptr;
  size_t length = 0;
  int32_t read_result = lonanote_resource_read_next(
      static_cast<uint64_t>(handle_id), &bytes, &length);
  if (read_result == 0) {
    return nullptr;
  }
  if (read_result != 1 || bytes == nullptr || length > static_cast<size_t>(INT_MAX)) {
    if (bytes != nullptr) {
      lonanote_resource_free_bytes(bytes, length);
    }
    throwIOException(env, "读取 Workspace resource 失败");
    return nullptr;
  }

  jbyteArray result = env->NewByteArray(static_cast<jsize>(length));
  if (result != nullptr) {
    env->SetByteArrayRegion(
        result, 0, static_cast<jsize>(length), reinterpret_cast<const jbyte *>(bytes));
  }
  lonanote_resource_free_bytes(bytes, length);
  return result;
}

extern "C" JNIEXPORT void JNICALL
Java_rs_craby_lonanoterustmodule_LonanoteResourceGateway_nativeClose(
    JNIEnv *,
    jclass,
    jlong handle_id) {
  if (handle_id > 0) {
    lonanote_resource_close(static_cast<uint64_t>(handle_id));
  }
}
