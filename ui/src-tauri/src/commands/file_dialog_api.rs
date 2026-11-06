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
pub struct SelectDialogResult {
    path: Option<String>,
    paths: Option<Vec<String>>,
}

/// 所属窗口模态：文件选择期间阻止该窗口交互，其他工作台窗口仍可正常工作。
#[tauri::command]
pub async fn select_files(
    window: WebviewWindow,
    options: SelectDialogOptions,
) -> Result<SelectDialogResult, String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_dialog::DialogExt;
        let mut dialog = window.dialog().file().set_parent(&window);
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
            SelectDialogResult { path: None, paths }
        } else {
            SelectDialogResult {
                path: paths.and_then(|v| v.into_iter().next()),
                paths: None,
            }
        })
    }
    #[cfg(not(desktop))]
    {
        let _ = (window, options);
        Err("当前平台不支持桌面文件选择器".into())
    }
}
