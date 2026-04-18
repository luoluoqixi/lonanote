use std::{path::PathBuf, process::Command};

pub fn show_in_folder(path: String) {
    #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
    {
        let path = PathBuf::from(&path);
        let path = if path.exists() {
            Some(path.to_str().unwrap().to_string())
        } else if path.parent().is_some() && path.parent().unwrap().exists() {
            Some(path.parent().unwrap().to_str().unwrap().to_string())
        } else {
            None
        };
        if path.is_none() {
            return;
        }
        let path = path.unwrap();

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            #[allow(clippy::zombie_processes)]
            Command::new("explorer")
                .creation_flags(CREATE_NO_WINDOW)
                .args(["/select,", &path]) // The comma after select is not a typo
                .spawn()
                .unwrap();
        }

        #[cfg(target_os = "linux")]
        {
            use fork::{daemon, Fork};
            use std::{fs::metadata, path::PathBuf};

            if path.contains(",") {
                // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
                let new_path = match metadata(&path).unwrap().is_dir() {
                    true => path,
                    false => {
                        let mut path2 = PathBuf::from(path);
                        path2.pop();
                        path2.into_os_string().into_string().unwrap()
                    }
                };
                Command::new("xdg-open").arg(&new_path).spawn().unwrap();
            } else {
                if let Ok(Fork::Child) = daemon(false, false) {
                    Command::new("dbus-send")
                        .args([
                            "--session",
                            "--dest=org.freedesktop.FileManager1",
                            "--type=method_call",
                            "/org/freedesktop/FileManager1",
                            "org.freedesktop.FileManager1.ShowItems",
                            format!("array:string:\"file://{path}\"").as_str(),
                            "string:\"\"",
                        ])
                        .spawn()
                        .unwrap();
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            if std::fs::exists(&path).unwrap_or(false) {
                Command::new("open").args(["-R", &path]).spawn().unwrap();
            }
        }
    }
}
