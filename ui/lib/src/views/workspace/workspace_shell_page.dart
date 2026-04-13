import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:lonanote_flutter_core/lonanote_flutter_core.dart';
import 'package:lonanote/src/common/utility.dart';
import 'package:lonanote/src/providers/workspace/open_file.dart';
import 'package:lonanote/src/providers/workspace/workspace.dart';
import 'package:lonanote/src/theme/theme_colors.dart';
import 'package:lonanote/src/views/editor/editor_page.dart';
import 'package:lonanote/src/views/editor/image_view_page.dart';
import 'package:lonanote/src/views/editor/not_support_file_page.dart';
import 'package:lonanote/src/views/editor/video_view_page.dart';
import 'package:lonanote/src/views/workspace/workspace_files_page.dart';

class WorkspaceShellPage extends ConsumerStatefulWidget {
  const WorkspaceShellPage({super.key});

  @override
  ConsumerState<WorkspaceShellPage> createState() => _WorkspaceShellPageState();
}

class _WorkspaceShellPageState extends ConsumerState<WorkspaceShellPage> {
  static const double _wideScreenBreakpoint = 720;
  static const double _fileListWidth = 300;
  final GlobalKey<EditorPageState> _editorKey = GlobalKey<EditorPageState>();

  bool _isWideScreen(BuildContext context) {
    return MediaQuery.of(context).size.width >= _wideScreenBreakpoint;
  }

  Future<void> _saveCurrentEditor() async {
    await _editorKey.currentState?.saveBeforeSwitch();
  }

  void _openFile(String fullPath, String path) async {
    final extName = Utility.getExtName(path);
    await _saveCurrentEditor();

    if (extName != null && Utility.isSupportEditor(extName)) {
      ref.read(currentOpenFileProvider.notifier).state = OpenFileInfo(
        fullPath: fullPath,
        path: path,
        type: OpenFileType.editor,
      );
    } else if (extName != null && Utility.isImage(extName)) {
      // 扫描同目录下的所有图片
      final dir = Utility.getBasePath(fullPath);
      final files = RustFs.getFileList(dir);
      List<String> imagePaths = [];
      var imageIndex = 0;
      if (files != null) {
        for (final f in files) {
          final ext = Utility.getExtName(f);
          if (ext != null && Utility.isImage(ext)) {
            if (f == fullPath) {
              imageIndex = imagePaths.length;
            }
            imagePaths.add(f);
          }
        }
      }
      if (imagePaths.isEmpty) {
        imagePaths = [fullPath];
        imageIndex = 0;
      }
      ref.read(currentOpenFileProvider.notifier).state = OpenFileInfo(
        fullPath: fullPath,
        path: path,
        type: OpenFileType.image,
        imagePaths: imagePaths,
        imageIndex: imageIndex,
      );
    } else if (extName != null && Utility.isVideo(extName)) {
      ref.read(currentOpenFileProvider.notifier).state = OpenFileInfo(
        fullPath: fullPath,
        path: path,
        type: OpenFileType.video,
      );
    } else {
      ref.read(currentOpenFileProvider.notifier).state = OpenFileInfo(
        fullPath: fullPath,
        path: path,
        type: OpenFileType.notSupported,
      );
    }
  }

  void _closeFile() async {
    await _saveCurrentEditor();
    ref.read(currentOpenFileProvider.notifier).state = null;
  }

  @override
  void dispose() {
    // 离开工作区时清理打开文件状态
    Future.microtask(() {
      ref.read(currentOpenFileProvider.notifier).state = null;
    });
    super.dispose();
  }

  Widget _buildEmptyPlaceholder(ColorScheme colorScheme) {
    return Scaffold(
      backgroundColor: ThemeColors.getBgColor(colorScheme),
      body: Center(
        child: Text(
          '选择一个文件',
          style: TextStyle(
            fontSize: 16,
            color: ThemeColors.getTextGreyColor(colorScheme),
          ),
        ),
      ),
    );
  }

  Widget _buildViewer(OpenFileInfo file) {
    switch (file.type) {
      case OpenFileType.editor:
        return EditorPage(
          key: _editorKey,
          path: file.path,
          onBack: _closeFile,
          onOpenFile: _openFile,
        );
      case OpenFileType.image:
        return ImageViewPage(
          paths: file.imagePaths ?? [file.fullPath],
          index: file.imageIndex ?? 0,
          onBack: _closeFile,
        );
      case OpenFileType.video:
        return VideoViewPage(
          path: file.fullPath,
          onBack: _closeFile,
        );
      case OpenFileType.notSupported:
        return NotSupportFilePage(
          path: file.fullPath,
          onBack: _closeFile,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentFile = ref.watch(currentOpenFileProvider);
    // 保持 workspaceProvider 存活，防止窄屏只显示 EditorPage 时该 provider 被 auto-dispose
    ref.watch(workspaceProvider);
    final colorScheme = ThemeColors.getColorScheme(context);
    final isWide = _isWideScreen(context);
    final hasFile = currentFile != null;

    // 文件列表：宽屏始终显示，窄屏仅无打开文件时显示
    final showFileList = isWide || !hasFile;

    // ignore: deprecated_member_use
    return WillPopScope(
      onWillPop: () async {
        if (!isWide && hasFile) {
          _closeFile();
          return false;
        }
        return true;
      },
      child: LayoutBuilder(
        builder: (context, constraints) {
          final screenWidth = constraints.maxWidth;
          // 编辑器是否可见：宽屏始终显示区域，窄屏仅有文件时显示
          final showEditor = isWide || hasFile;
          return Stack(
            children: [
              // Index 0: 文件列表 —— 始终在树中，用 Offstage 控制可见性
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: isWide ? _fileListWidth : screenWidth,
                child: Offstage(
                  offstage: !showFileList,
                  child: WorkspaceFilesPage(onOpenFile: _openFile),
                ),
              ),
              // Index 1: 分割线 —— 始终在树中，保持索引稳定
              Positioned(
                left: _fileListWidth,
                top: 0,
                bottom: 0,
                child: Offstage(
                  offstage: !isWide,
                  child: VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: colorScheme.outlineVariant,
                  ),
                ),
              ),
              // Index 2: 查看器区域 —— 始终在树中，保持索引稳定
              Positioned(
                left: isWide ? _fileListWidth + 1 : 0,
                top: 0,
                bottom: 0,
                right: 0,
                child: Offstage(
                  offstage: !showEditor,
                  child: hasFile
                      ? _buildViewer(currentFile)
                      : _buildEmptyPlaceholder(colorScheme),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
