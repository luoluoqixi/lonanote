use std::path::PathBuf;

#[cfg(target_os = "windows")]
fn shell_execute(operation: &str, file: &str, params: Option<&str>) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;

    unsafe extern "system" {
        fn ShellExecuteW(
            hwnd: *mut std::ffi::c_void,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show_cmd: i32,
        ) -> *mut std::ffi::c_void;
    }

    let to_wide = |s: &str| -> Vec<u16> { OsStr::new(s).encode_wide().chain(Some(0)).collect() };
    let op_w = to_wide(operation);
    let file_w = to_wide(file);
    let params_w = params.map(to_wide);
    const SW_SHOWNORMAL: i32 = 1;
    unsafe {
        ShellExecuteW(
            ptr::null_mut(),
            op_w.as_ptr(),
            file_w.as_ptr(),
            params_w.as_ref().map_or(ptr::null(), |p| p.as_ptr()),
            ptr::null(),
            SW_SHOWNORMAL,
        );
    }
}

pub fn open_folder(path: String) {
    let path = PathBuf::from(&path);
    let dir = if path.is_dir() {
        Some(path)
    } else {
        path.parent()
            .filter(|p| p.exists())
            .map(|p| p.to_path_buf())
    };
    let Some(dir) = dir else { return };
    let dir = dir.to_str().unwrap();

    #[cfg(target_os = "windows")]
    {
        let dir = dir.to_string();
        std::thread::spawn(move || shell_execute("open", &dir, None));
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("open").arg(dir).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let _ = Command::new("xdg-open").arg(dir).spawn();
    }
}

pub fn show_in_folder(path: String) {
    let path = PathBuf::from(&path);
    let path = if path.exists() {
        Some(path.to_str().unwrap().to_string())
    } else {
        path.parent()
            .filter(|p| p.exists())
            .map(|p| p.to_str().unwrap().to_string())
    };
    let Some(path) = path else { return };

    #[cfg(target_os = "windows")]
    std::thread::spawn(move || {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use std::ptr;

        unsafe extern "system" {
            fn CoInitializeEx(reserved: *mut std::ffi::c_void, co_init: u32) -> i32;
            fn CoUninitialize();
        }

        #[link(name = "shell32")]
        unsafe extern "system" {
            fn ILCreateFromPathW(path: *const u16) -> *mut std::ffi::c_void;
            fn ILFree(pidl: *mut std::ffi::c_void);
            fn SHOpenFolderAndSelectItems(
                pidl_folder: *const std::ffi::c_void,
                cidl: u32,
                apidl: *const *const std::ffi::c_void,
                flags: u32,
            ) -> i32;
        }

        let wide: Vec<u16> = OsStr::new(&path).encode_wide().chain(Some(0)).collect();
        unsafe {
            CoInitializeEx(ptr::null_mut(), 0);
            let pidl = ILCreateFromPathW(wide.as_ptr());
            if !pidl.is_null() {
                SHOpenFolderAndSelectItems(pidl, 0, ptr::null(), 0);
                ILFree(pidl);
            }
            CoUninitialize();
        }
    });

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        if path.contains(",") {
            use std::fs::metadata;
            let new_path = match metadata(&path).unwrap().is_dir() {
                true => path,
                false => {
                    let mut p = PathBuf::from(path);
                    p.pop();
                    p.into_os_string().into_string().unwrap()
                }
            };
            let _ = Command::new("xdg-open").arg(&new_path).spawn();
        } else {
            use fork::{daemon, Fork};
            if let Ok(Fork::Child) = daemon(false, false) {
                let _ = Command::new("dbus-send")
                    .args([
                        "--session",
                        "--dest=org.freedesktop.FileManager1",
                        "--type=method_call",
                        "/org/freedesktop/FileManager1",
                        "org.freedesktop.FileManager1.ShowItems",
                        &format!("array:string:\"file://{}\"", path),
                        "string:\"\"",
                    ])
                    .spawn();
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if std::fs::exists(&path).unwrap_or(false) {
            let _ = Command::new("open").args(["-R", &path]).spawn();
        }
    }
}
