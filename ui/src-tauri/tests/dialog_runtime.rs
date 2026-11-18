// 独立运行纯会话/输入锁测试，避免 Windows GUI 测试进程依赖 WebView2 DLL。
#![allow(dead_code)]
#[path = "../src/setup/dialog_input_locks.rs"]
mod dialog_input_locks;
#[path = "../src/setup/dialog_sessions.rs"]
mod dialog_sessions;
#[cfg(windows)]
#[path = "../src/setup/dialog_window_parent.rs"]
mod dialog_window_parent;

#[cfg(windows)]
mod native_parent_tests {
    use windows::{
        core::w,
        Win32::{
            Foundation::HWND,
            UI::WindowsAndMessaging::{
                CreateWindowExW, DestroyWindow, GetWindow, GetWindowLongPtrW, SetWindowLongPtrW,
                SetWindowPos, GWL_EXSTYLE, GWL_STYLE, GW_OWNER, HWND_NOTOPMOST, HWND_TOPMOST,
                SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_CHILD,
                WS_DISABLED, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_OVERLAPPEDWINDOW,
            },
        },
    };

    struct NativeWindow(HWND);
    impl NativeWindow {
        fn new() -> Self {
            Self::with_topmost(false)
        }
        fn with_topmost(topmost: bool) -> Self {
            Self(unsafe {
                CreateWindowExW(
                    WS_EX_APPWINDOW
                        | if topmost {
                            WS_EX_TOPMOST
                        } else {
                            Default::default()
                        },
                    w!("STATIC"),
                    w!("Dialog 测试"),
                    WS_OVERLAPPEDWINDOW,
                    0,
                    0,
                    320,
                    220,
                    None,
                    None,
                    None,
                    None,
                )
                .unwrap()
            })
        }
    }
    impl Drop for NativeWindow {
        fn drop(&mut self) {
            unsafe {
                let _ = DestroyWindow(self.0);
            }
        }
    }

    fn set_topmost(window: HWND, value: bool) {
        unsafe {
            SetWindowPos(
                window,
                Some(if value { HWND_TOPMOST } else { HWND_NOTOPMOST }),
                0,
                0,
                0,
                0,
                SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
            )
            .unwrap();
        }
    }

    fn is_topmost(window: HWND) -> bool {
        unsafe { GetWindowLongPtrW(window, GWL_EXSTYLE) as u32 & WS_EX_TOPMOST.0 != 0 }
    }

    #[test]
    fn new_dialog_joins_topmost_owner_and_follows_owner_unpin() {
        let parent = NativeWindow::with_topmost(true);
        assert!(is_topmost(parent.0), "测试父窗口已经置顶");
        let dialog = NativeWindow::new();
        super::dialog_window_parent::attach_owner(dialog.0, parent.0).unwrap();
        assert!(is_topmost(dialog.0), "新 Dialog 必须进入置顶父窗口所在层级");
        // 模拟 Tao 在 show/resize 等变化时按缓存 flags 重写窗口样式。
        unsafe {
            let style = GetWindowLongPtrW(dialog.0, GWL_EXSTYLE);
            SetWindowLongPtrW(dialog.0, GWL_EXSTYLE, style & !(WS_EX_TOPMOST.0 as isize));
            SetWindowPos(
                dialog.0,
                None,
                0,
                0,
                480,
                320,
                SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOZORDER,
            )
            .unwrap();
            assert!(is_topmost(dialog.0), "样式刷新不能移除继承的置顶层级");
            assert_ne!(
                GetWindowLongPtrW(dialog.0, GWL_EXSTYLE) as u32 & WS_EX_APPWINDOW.0,
                0
            );
        }

        let nested = NativeWindow::new();
        super::dialog_window_parent::attach_owner(nested.0, dialog.0).unwrap();
        assert!(is_topmost(nested.0), "嵌套 Dialog 同样继承实际父窗口层级");

        set_topmost(parent.0, false);
        assert!(
            !is_topmost(dialog.0),
            "父窗口取消置顶后 Dialog 不能永久置顶"
        );
        assert!(!is_topmost(nested.0));
    }

    #[test]
    fn existing_dialog_follows_owner_pin_without_promoting_unrelated_windows() {
        let unrelated = NativeWindow::new();
        let parent = NativeWindow::new();
        let dialog = NativeWindow::new();
        super::dialog_window_parent::attach_owner(dialog.0, parent.0).unwrap();
        assert!(!is_topmost(dialog.0));
        set_topmost(parent.0, true);
        assert!(is_topmost(dialog.0));
        assert!(!is_topmost(unrelated.0));
        set_topmost(parent.0, false);
        assert!(!is_topmost(dialog.0));
    }

    #[test]
    fn owned_dialog_keeps_top_level_taskbar_styles_and_parent_input() {
        let parent = NativeWindow::new();
        let dialog = NativeWindow::new();
        super::dialog_window_parent::attach_owner(dialog.0, parent.0).unwrap();
        unsafe {
            assert_eq!(GetWindow(dialog.0, GW_OWNER).unwrap(), parent.0);
            assert_eq!(
                GetWindowLongPtrW(parent.0, GWL_STYLE) as u32 & WS_DISABLED.0,
                0
            );
            SetWindowPos(
                dialog.0,
                None,
                0,
                0,
                480,
                320,
                SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOZORDER,
            )
            .unwrap();
            let extended = GetWindowLongPtrW(dialog.0, GWL_EXSTYLE) as u32;
            assert_ne!(extended & WS_EX_APPWINDOW.0, 0);
            assert_eq!(extended & WS_EX_TOOLWINDOW.0, 0);
            assert_eq!(
                GetWindowLongPtrW(dialog.0, GWL_STYLE) as u32 & WS_CHILD.0,
                0
            );
            assert_eq!(GetWindow(dialog.0, GW_OWNER).unwrap(), parent.0);
        }
    }

    #[test]
    fn invalid_dialog_handle_returns_an_error() {
        let parent = NativeWindow::new();
        assert!(super::dialog_window_parent::attach_owner(HWND::default(), parent.0).is_err());
    }
}
