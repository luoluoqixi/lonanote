use tauri::WebviewWindow;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SelectDialogType {
    OpenFile,
    OpenFiles,
    OpenFolder,
    OpenFolders,
    SaveFile,
}
#[derive(serde::Deserialize)]
pub struct Filter {
    name: String,
    extensions: Vec<String>,
}
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectDialogOptions {
    #[serde(rename = "type")]
    kind: SelectDialogType,
    title: Option<String>,
    filters: Option<Vec<Filter>>,
    default_directory: Option<String>,
    default_file_name: Option<String>,
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectDialogResult {
    path: Option<String>,
    paths: Option<Vec<String>>,
    overwrite_confirmed: bool,
}

/// 所属窗口模态：文件选择期间阻止该窗口交互，其他工作台窗口仍可正常工作。
#[tauri::command]
pub async fn select_files(
    window: WebviewWindow,
    options: SelectDialogOptions,
    parent_window_label: Option<String>,
) -> Result<SelectDialogResult, String> {
    #[cfg(desktop)]
    {
        use tauri::Manager;
        use tauri_plugin_dialog::DialogExt;
        let parent_label = parent_window_label.as_deref().unwrap_or(window.label());
        crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .authorize_dialog_parent(window.label(), parent_label)?;
        let parent = window
            .app_handle()
            .get_webview_window(parent_label)
            .ok_or("对话框所属窗口已关闭")?;
        let mut dialog = window.dialog().file().set_parent(&parent);
        if let Some(title) = options.title {
            dialog = dialog.set_title(title);
        }
        if let Some(directory) = options.default_directory {
            dialog = dialog.set_directory(directory);
        }
        if let Some(name) = options.default_file_name {
            dialog = dialog.set_file_name(name);
        }
        for filter in options.filters.unwrap_or_default() {
            dialog = dialog.add_filter(
                filter.name,
                &filter
                    .extensions
                    .iter()
                    .map(String::as_str)
                    .collect::<Vec<_>>(),
            );
        }
        let multiple = matches!(
            options.kind,
            SelectDialogType::OpenFiles | SelectDialogType::OpenFolders
        );
        // Windows IFileSaveDialog、macOS NSSavePanel 及 Linux 保存 chooser 负责覆盖确认。
        let save = matches!(options.kind, SelectDialogType::SaveFile);
        let (sender, receiver) = tokio::sync::oneshot::channel();
        match options.kind {
            SelectDialogType::OpenFile => dialog.pick_file(move |value| {
                let _ = sender.send(value.map(|v| vec![v]));
            }),
            SelectDialogType::OpenFolder => dialog.pick_folder(move |value| {
                let _ = sender.send(value.map(|v| vec![v]));
            }),
            SelectDialogType::SaveFile => dialog.save_file(move |value| {
                let _ = sender.send(value.map(|v| vec![v]));
            }),
            SelectDialogType::OpenFiles => dialog.pick_files(move |value| {
                let _ = sender.send(value);
            }),
            SelectDialogType::OpenFolders => dialog.pick_folders(move |value| {
                let _ = sender.send(value);
            }),
        }
        let files = receiver.await.map_err(|e| e.to_string())?;
        let paths = files
            .map(|files| {
                files
                    .into_iter()
                    .map(|file| {
                        file.into_path()
                            .map(|path| path.to_string_lossy().into_owned())
                            .map_err(|_| "所选项目不提供本地路径".to_string())
                    })
                    .collect::<Result<Vec<_>, _>>()
            })
            .transpose()?;
        Ok(if multiple {
            SelectDialogResult {
                path: None,
                paths,
                overwrite_confirmed: false,
            }
        } else {
            let path = paths.and_then(|v| v.into_iter().next());
            SelectDialogResult {
                overwrite_confirmed: save && path.is_some(),
                path,
                paths: None,
            }
        })
    }
    #[cfg(not(desktop))]
    {
        let _ = (window, options, parent_window_label);
        Err("当前平台不支持桌面文件选择器".into())
    }
}
