use windows::{
    core::Result,
    Win32::{
        Foundation::{GetLastError, SetLastError, ERROR_SUCCESS, HWND},
        UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWLP_HWNDPARENT, GWL_EXSTYLE,
            HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, WS_EX_TOPMOST,
        },
    },
};

/// 给已创建的顶级窗口设置真实 owner，保留其运行时任务栏样式状态。
pub(crate) fn attach_owner(window: HWND, parent: HWND) -> Result<()> {
    unsafe {
        SetLastError(ERROR_SUCCESS);
        let previous = SetWindowLongPtrW(window, GWLP_HWNDPARENT, parent.0 as isize);
        // 没有旧 owner 时成功也返回 0，必须读取 last-error 区分失败。
        if previous == 0 {
            GetLastError().ok()?;
        }
        // 后绑定 owner 不会自动加入父窗口已有的置顶层级；读取原生状态以支持嵌套 Dialog。
        // 保留 owner 关系，由系统在父窗口取消置顶时一并恢复，不设置 Tao 独立置顶 flag。
        if GetWindowLongPtrW(parent, GWL_EXSTYLE) as u32 & WS_EX_TOPMOST.0 != 0 {
            SetWindowPos(
                window,
                Some(HWND_TOPMOST),
                0,
                0,
                0,
                0,
                SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER,
            )?;
        }
    }
    Ok(())
}
