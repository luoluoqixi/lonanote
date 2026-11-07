package expo.modules.systemfonts

import android.graphics.Typeface
import android.graphics.fonts.Font
import android.graphics.fonts.FontFamily
import android.graphics.fonts.SystemFonts
import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.common.assets.ReactFontManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

class NativeSystemFontsModule : Module() {
  private val aliases = listOf("sans-serif", "serif", "monospace")
  // API 28 以下不触碰 fonts.Font 类的实例；只使用公开、稳定的 family aliases。
  private var catalog: Map<String, List<Any>>? = null

  @RequiresApi(29)
  private fun scan(): Map<String, List<Any>> {
    val result = linkedMapOf<String, MutableList<Any>>()
    SystemFonts.getAvailableFonts().forEach { font ->
      try {
        val family = fontName(font.buffer, font.ttcIndex, listOf(16, 1)) ?: return@forEach
        if (listOf("emoji", "symbol", "icon").any { family.lowercase().contains(it) }) return@forEach
        result.getOrPut(family) { mutableListOf() }.add(font)
      } catch (_: Exception) { /* 单个损坏或无法解析的字体不阻断目录。 */ }
    }
    return result
  }

  private fun families(refresh: Boolean): Map<String, List<Any>> {
    if (refresh || catalog == null) catalog = if (Build.VERSION.SDK_INT >= 29) scan() else emptyMap()
    return catalog!!
  }

  override fun definition() = ModuleDefinition {
    Name("NativeSystemFonts")
    AsyncFunction("list") { refresh: Boolean ->
      (aliases + families(refresh).keys).distinct().sorted().map { family ->
        mapOf("platform" to "android", "familyKey" to family, "displayName" to family,
          "ui" to mapOf("available" to true), "editor" to mapOf("available" to true))
      }
    }
    AsyncFunction("resolve") { selection: Map<String, String>, consumer: String ->
      require(selection["platform"] == "android" && consumer in listOf("ui", "editor")) { "字体平台或使用位置无效" }
      val family = selection["familyKey"] ?: error("字体身份无效")
      if (family in aliases) {
        mapOf("family" to family, "faces" to emptyList<Any>())
      } else {
        require(Build.VERSION.SDK_INT >= 29) { "当前系统仅支持系统字体族" }
        val fonts = families(false)[family]?.map { it as Font } ?: error("当前字体不可用，已使用系统默认")
        resolveFamily(family, fonts, consumer)
      }
    }
  }

  @RequiresApi(29)
  private fun resolveFamily(family: String, fonts: List<Font>, consumer: String): Map<String, Any> {
    val unique = fonts.distinctBy { Pair(it.style.weight, it.style.slant) }
    if (consumer == "ui") {
      val builder = FontFamily.Builder(unique.first())
      unique.drop(1).forEach { builder.addFont(it) }
      val typeface = Typeface.CustomFallbackBuilder(builder.build()).setSystemFallback("sans-serif").build()
      val digest = MessageDigest.getInstance("SHA-256").digest(family.toByteArray()).take(12).joinToString("") { "%02x".format(it) }
      val alias = "LonaSystemFont_$digest"
      ReactFontManager.getInstance().addCustomFont(alias, typeface)
      return mapOf("family" to alias, "faces" to emptyList<Any>())
    }
    val faces = unique.mapNotNull { font ->
      val postscript = fontName(font.buffer, font.ttcIndex, listOf(6)) ?: return@mapNotNull null
      mapOf("family" to family, "weight" to font.style.weight, "italic" to (font.style.slant == 1),
        "source" to mapOf("kind" to "local", "name" to postscript))
    }
    require(faces.isNotEmpty()) { "此字体不能在编辑器中加载" }
    return mapOf("family" to family, "faces" to faces)
  }

  /** 只读 OpenType name 表；TTC 的 table offset 相对于整个文件，不能默认使用第一个 face。 */
  private fun fontName(input: ByteBuffer, index: Int, ids: List<Int>): String? {
    val buffer = input.duplicate().order(ByteOrder.BIG_ENDIAN)
    fun u16(at: Int) = buffer.getShort(at).toInt() and 0xffff
    val face = if (buffer.getInt(0) == 0x74746366) {
      require(index >= 0 && index < buffer.getInt(8)); buffer.getInt(12 + index * 4)
    } else { require(index == 0); 0 }
    val count = u16(face + 4)
    require(count <= 4096)
    var nameOffset: Int? = null
    for (n in 0 until count) {
      val table = face + 12 + n * 16
      if (buffer.getInt(table) == 0x6e616d65) { nameOffset = buffer.getInt(table + 8); break }
    }
    val start = nameOffset ?: return null
    val records = u16(start + 2)
    val strings = start + u16(start + 4)
    require(records <= 8192)
    for (wanted in ids) {
      val candidates = mutableListOf<Pair<Int, String>>()
      for (n in 0 until records) {
        val at = start + 6 + n * 12
        val platform = u16(at)
        if (u16(at + 6) != wanted || platform !in listOf(0, 3)) continue
        val length = u16(at + 8)
        val offset = strings + u16(at + 10)
        if (length <= 0 || length > 2048 || offset < 0 || offset.toLong() + length > buffer.limit()) continue
        val bytes = ByteArray(length)
        val slice = buffer.duplicate()
        slice.position(offset)
        slice.get(bytes)
        val name = String(bytes, Charsets.UTF_16BE).trim().trim('\u0000')
        if (name.isNotEmpty()) candidates.add(Pair(if (u16(at + 4) == 0x0409) 0 else 1, name))
      }
      candidates.minByOrNull { it.first }?.let { return it.second }
    }
    return null
  }
}
