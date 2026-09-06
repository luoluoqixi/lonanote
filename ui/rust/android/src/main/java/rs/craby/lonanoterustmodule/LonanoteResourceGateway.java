package rs.craby.lonanoterustmodule;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import androidx.annotation.Nullable;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** 将 Android WebView resource request 适配到 Rust Resource Gateway，资源字节不会经过 RN bridge。 */
public final class LonanoteResourceGateway {
  private static final String RESOURCE_SCHEME = "lonanote-resource";
  private static final String RESOURCE_HOST = "resource";

  private LonanoteResourceGateway() {}

  @Nullable
  public static WebResourceResponse shouldIntercept(WebResourceRequest webRequest) {
    Uri url = webRequest.getUrl();
    if (!RESOURCE_SCHEME.equalsIgnoreCase(url.getScheme())) {
      return null;
    }
    if (!"GET".equalsIgnoreCase(webRequest.getMethod())) {
      return errorResponse(400, "Bad Request", null);
    }

    try {
      JSONObject request = parseRequest(url, webRequest.getRequestHeaders());
      if (request == null) {
        return errorResponse(400, "Bad Request", null);
      }
      String responseJson = nativeOpen(request.toString());
      if (responseJson == null) {
        return errorResponse(500, "Internal Server Error", null);
      }
      return toWebResourceResponse(new JSONObject(responseJson));
    } catch (JSONException | RuntimeException error) {
      return errorResponse(500, "Internal Server Error", null);
    }
  }

  @Nullable
  private static JSONObject parseRequest(Uri url, Map<String, String> requestHeaders)
      throws JSONException {
    if (!RESOURCE_HOST.equalsIgnoreCase(url.getHost())) {
      return null;
    }

    String encodedPath = url.getEncodedPath();
    if (encodedPath == null) {
      return null;
    }
    String[] segments = encodedPath.split("/", -1);
    if (segments.length < 4 || !segments[0].isEmpty()) {
      return null;
    }
    for (int index = 1; index < segments.length; index += 1) {
      if (segments[index].isEmpty()) {
        return null;
      }
    }

    String scopeId = segments[1];
    if (scopeId.indexOf('%') >= 0 || scopeId.indexOf('\\') >= 0 || containsControlCharacter(scopeId)) {
      return null;
    }
    long generation;
    try {
      generation = Long.parseLong(segments[2]);
    } catch (NumberFormatException error) {
      return null;
    }
    if (generation <= 0) {
      return null;
    }

    StringBuilder path = new StringBuilder();
    for (int index = 3; index < segments.length; index += 1) {
      String decoded = Uri.decode(segments[index]);
      if (!isValidPathSegment(decoded)) {
        return null;
      }
      if (path.length() > 0) {
        path.append('/');
      }
      path.append(decoded);
    }

    JSONObject request = new JSONObject();
    request.put("scopeId", scopeId);
    request.put("generation", generation);
    request.put("path", path.toString());

    String rangeHeader = headerValue(requestHeaders, "Range");
    JSONObject range = parseRange(rangeHeader);
    if (rangeHeader != null && range == null) {
      return null;
    }
    if (range != null) {
      request.put("range", range);
    }
    String ifNoneMatch = headerValue(requestHeaders, "If-None-Match");
    if (ifNoneMatch != null && !ifNoneMatch.isEmpty()) {
      request.put("ifNoneMatch", ifNoneMatch);
    }
    return request;
  }

  @Nullable
  private static JSONObject parseRange(@Nullable String value) throws JSONException {
    if (value == null || !value.startsWith("bytes=")) {
      return null;
    }
    String rawRange = value.substring("bytes=".length());
    if (rawRange.contains(",")) {
      return null;
    }
    String[] parts = rawRange.split("-", -1);
    if (parts.length != 2 || parts[0].isEmpty()) {
      return null;
    }
    try {
      long start = Long.parseLong(parts[0]);
      long endInclusive = parts[1].isEmpty() ? Long.MAX_VALUE : Long.parseLong(parts[1]);
      if (start < 0 || endInclusive < start) {
        return null;
      }
      JSONObject range = new JSONObject();
      range.put("start", start);
      range.put("endInclusive", endInclusive);
      return range;
    } catch (NumberFormatException error) {
      return null;
    }
  }

  private static WebResourceResponse toWebResourceResponse(JSONObject response) throws JSONException {
    int status = response.optInt("status", 500);
    JSONObject headers = response.optJSONObject("headers");
    Long totalLength = response.has("totalLength") && !response.isNull("totalLength")
        ? response.getLong("totalLength")
        : null;
    if (headers == null) {
      return errorResponse(status, reasonPhrase(status), totalLength);
    }

    Map<String, String> responseHeaders = new HashMap<>();
    responseHeaders.put("Accept-Ranges", "bytes");
    responseHeaders.put("Content-Length", Long.toString(headers.getLong("contentLength")));
    responseHeaders.put("Cache-Control", headers.getString("cacheControl"));
    responseHeaders.put("ETag", headers.getString("etag"));
    JSONObject contentRange = headers.optJSONObject("contentRange");
    if (contentRange != null) {
      responseHeaders.put(
          "Content-Range",
          String.format(
              Locale.ROOT,
              "bytes %d-%d/%d",
              contentRange.getLong("start"),
              contentRange.getLong("endInclusive"),
              headers.getLong("totalLength")));
    }

    long handleId = response.optLong("handleId", 0);
    InputStream body = handleId > 0
        ? new NativeResourceInputStream(handleId)
        : new ByteArrayInputStream(new byte[0]);
    return new WebResourceResponse(
        headers.getString("contentType"),
        null,
        status,
        reasonPhrase(status),
        responseHeaders,
        body);
  }

  private static WebResourceResponse errorResponse(int status, String reasonPhrase, @Nullable Long totalLength) {
    Map<String, String> headers = new HashMap<>();
    headers.put("Content-Length", "0");
    if (totalLength != null) {
      headers.put("Content-Range", "bytes */" + totalLength);
    }
    return new WebResourceResponse(
        "text/plain",
        "utf-8",
        status,
        reasonPhrase,
        headers,
        new ByteArrayInputStream(new byte[0]));
  }

  private static String reasonPhrase(int status) {
    switch (status) {
      case 200:
        return "OK";
      case 206:
        return "Partial Content";
      case 304:
        return "Not Modified";
      case 400:
        return "Bad Request";
      case 403:
        return "Forbidden";
      case 404:
        return "Not Found";
      case 416:
        return "Range Not Satisfiable";
      default:
        return "Internal Server Error";
    }
  }

  @Nullable
  private static String headerValue(Map<String, String> headers, String name) {
    if (headers == null) {
      return null;
    }
    for (Map.Entry<String, String> entry : headers.entrySet()) {
      if (name.equalsIgnoreCase(entry.getKey())) {
        return entry.getValue();
      }
    }
    return null;
  }

  private static boolean isValidPathSegment(String value) {
    return !value.isEmpty()
        && value.indexOf('/') < 0
        && value.indexOf('\\') < 0
        && value.indexOf('%') < 0
        && !".".equals(value)
        && !"..".equals(value)
        && !containsControlCharacter(value);
  }

  private static boolean containsControlCharacter(String value) {
    for (int index = 0; index < value.length(); index += 1) {
      if (Character.isISOControl(value.charAt(index))) {
        return true;
      }
    }
    return false;
  }

  private static final class NativeResourceInputStream extends InputStream {
    private long handleId;
    @Nullable private byte[] chunk;
    private int chunkOffset;

    NativeResourceInputStream(long handleId) {
      this.handleId = handleId;
    }

    @Override
    public int read() throws IOException {
      byte[] oneByte = new byte[1];
      return read(oneByte, 0, 1) == -1 ? -1 : oneByte[0] & 0xff;
    }

    @Override
    public int read(byte[] buffer, int offset, int length) throws IOException {
      if (buffer == null) {
        throw new NullPointerException("buffer");
      }
      if (offset < 0 || length < 0 || length > buffer.length - offset) {
        throw new IndexOutOfBoundsException();
      }
      if (length == 0) {
        return 0;
      }
      if (!ensureChunk()) {
        return -1;
      }
      int copied = Math.min(length, chunk.length - chunkOffset);
      System.arraycopy(chunk, chunkOffset, buffer, offset, copied);
      chunkOffset += copied;
      return copied;
    }

    @Override
    public void close() {
      closeHandle();
    }

    private boolean ensureChunk() throws IOException {
      while (chunk == null || chunkOffset >= chunk.length) {
        if (handleId == 0) {
          return false;
        }
        try {
          chunk = nativeReadNext(handleId);
        } catch (IOException error) {
          closeHandle();
          throw error;
        }
        chunkOffset = 0;
        if (chunk == null) {
          closeHandle();
          return false;
        }
      }
      return true;
    }

    private void closeHandle() {
      if (handleId == 0) {
        return;
      }
      nativeClose(handleId);
      handleId = 0;
      chunk = null;
      chunkOffset = 0;
    }
  }

  @Nullable private static native String nativeOpen(String requestJson);

  @Nullable private static native byte[] nativeReadNext(long handleId) throws IOException;

  private static native void nativeClose(long handleId);
}
