use super::dialog_window_api::{NativeMessageButtons, NativeMessageKind};
use windows::{
    core::PCWSTR,
    Win32::UI::Controls::{
        TaskDialogIndirect, TASKDIALOGCONFIG, TASKDIALOGCONFIG_0, TASKDIALOG_BUTTON,
        TDF_ALLOW_DIALOG_CANCELLATION, TDF_POSITION_RELATIVE_TO_WINDOW, TDF_SIZE_TO_CONTENT,
        TD_ERROR_ICON, TD_INFORMATION_ICON, TD_WARNING_ICON,
    },
};

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

pub(super) fn show(
    parent: &tauri::WebviewWindow,
    title: String,
    message: String,
    kind: NativeMessageKind,
    buttons: NativeMessageButtons,
) -> Result<String, String> {
    let title = wide(&title);
    let message = wide(&message);
    // ID 2 同时处理 Escape、关闭按钮和显式取消，不会误触发破坏性动作。
    let labels = match buttons {
        NativeMessageButtons::Ok { ok } => vec![(1000, ok)],
        NativeMessageButtons::OkCancel { ok, cancel } => vec![(1000, ok), (2, cancel)],
        NativeMessageButtons::YesNoCancel { yes, no, cancel } => {
            vec![(1004, yes), (1008, no), (2, cancel)]
        }
    };
    let texts: Vec<_> = labels.iter().map(|(_, label)| wide(label)).collect();
    let native_buttons: Vec<_> = labels
        .iter()
        .zip(&texts)
        .map(|((id, _), text)| TASKDIALOG_BUTTON {
            nButtonID: *id,
            pszButtonText: PCWSTR(text.as_ptr()),
        })
        .collect();
    let config = TASKDIALOGCONFIG {
        cbSize: std::mem::size_of::<TASKDIALOGCONFIG>() as u32,
        hwndParent: parent.hwnd().map_err(|e| e.to_string())?,
        // rfd 未设置此标志，Windows 默认把 Task Dialog 放在屏幕中间。
        dwFlags: TDF_ALLOW_DIALOG_CANCELLATION
            | TDF_SIZE_TO_CONTENT
            | TDF_POSITION_RELATIVE_TO_WINDOW,
        pszWindowTitle: PCWSTR(title.as_ptr()),
        pszContent: PCWSTR(message.as_ptr()),
        Anonymous1: TASKDIALOGCONFIG_0 {
            pszMainIcon: match kind {
                NativeMessageKind::Info => TD_INFORMATION_ICON,
                NativeMessageKind::Warning => TD_WARNING_ICON,
                NativeMessageKind::Error => TD_ERROR_ICON,
            },
        },
        cButtons: native_buttons.len() as u32,
        pButtons: native_buttons.as_ptr(),
        nDefaultButton: if labels.iter().any(|(id, _)| *id == 2) {
            2
        } else {
            1000
        },
        ..Default::default()
    };
    let mut selected = 0;
    unsafe { TaskDialogIndirect(&config, Some(&mut selected), None, None) }
        .map_err(|e| e.to_string())?;
    Ok(labels
        .into_iter()
        .find(|(id, _)| *id == selected)
        .map(|(_, text)| format!("custom:{text}"))
        .unwrap_or_else(|| "cancel".into()))
}
