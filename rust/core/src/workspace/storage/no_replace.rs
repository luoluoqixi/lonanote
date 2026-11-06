use std::{io, path::Path};

/// 使用操作系统的原子不覆盖提交；不允许退化为 exists + rename。
pub(super) fn rename_no_replace(from: &Path, to: &Path) -> io::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn MoveFileExW(from: *const u16, to: *const u16, flags: u32) -> i32;
        }
        let from: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();
        let to: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
        // flags=0 明确不带 MOVEFILE_REPLACE_EXISTING。
        if unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), 0) } == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(())
    }
    #[cfg(any(
        target_os = "linux",
        target_os = "android",
        target_os = "macos",
        target_os = "ios"
    ))]
    {
        use std::{ffi::CString, os::unix::ffi::OsStrExt};
        let from = CString::new(from.as_os_str().as_bytes()).map_err(io::Error::other)?;
        let to = CString::new(to.as_os_str().as_bytes()).map_err(io::Error::other)?;
        #[cfg(any(target_os = "linux", target_os = "android"))]
        let result = {
            unsafe extern "C" {
                fn renameat2(
                    olddir: i32,
                    old: *const std::ffi::c_char,
                    newdir: i32,
                    new: *const std::ffi::c_char,
                    flags: u32,
                ) -> i32;
            }
            unsafe { renameat2(-100, from.as_ptr(), -100, to.as_ptr(), 1) }
        };
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        let result = {
            unsafe extern "C" {
                fn renamex_np(
                    old: *const std::ffi::c_char,
                    new: *const std::ffi::c_char,
                    flags: u32,
                ) -> i32;
            }
            unsafe { renamex_np(from.as_ptr(), to.as_ptr(), 4) }
        };
        if result == -1 {
            return Err(io::Error::last_os_error());
        }
        Ok(())
    }
    #[cfg(not(any(
        windows,
        target_os = "linux",
        target_os = "android",
        target_os = "macos",
        target_os = "ios"
    )))]
    {
        let _ = (from, to);
        Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "文件系统不支持不覆盖提交",
        ))
    }
}
