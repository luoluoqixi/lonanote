use anyhow::Result;
use cmdreg::{command, Json};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    path::PathBuf,
};
use walkdir::WalkDir;

use crate::utils::{self, fs_utils};

#[command("fs")]
fn exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[command("fs")]
fn is_dir(path: String) -> bool {
    let p = PathBuf::from(path);
    p.exists() && p.is_dir()
}

#[command("fs")]
fn is_file(path: String) -> bool {
    let p = PathBuf::from(path);
    p.exists() && p.is_file()
}

#[command("fs")]
fn read_to_string(path: String) -> anyhow::Result<String> {
    let mut file = fs::File::open(path)?;
    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    Ok(utils::read_string(&buf))
}

#[command("fs")]
fn read_binary(path: String) -> anyhow::Result<Vec<u8>> {
    Ok(fs::read(path)?)
}

#[command("fs")]
async fn read_to_string_async(path: String) -> anyhow::Result<String> {
    Ok(tokio::fs::read_to_string(path).await?)
}

#[command("fs")]
async fn read_binary_async(path: String) -> anyhow::Result<Vec<u8>> {
    Ok(tokio::fs::read(path).await?)
}

#[command("fs")]
fn create_dir(path: String) -> Result<()> {
    if !PathBuf::from(&path).exists() {
        fs::create_dir(path)?;
    }
    Ok(())
}

#[command("fs")]
fn create_dir_all(path: String) -> Result<()> {
    if !PathBuf::from(&path).exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

#[command("fs")]
fn create_file(path: String, contents: String) -> Result<()> {
    let path = PathBuf::from(&path);
    if path.exists() {
        return Err(anyhow::anyhow!("path already exists: {}", path.display()));
    }
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, contents)?;
        Ok(())
    } else {
        Err(anyhow::anyhow!("path parent is None: {}", path.display()))
    }
}

#[command("fs")]
fn delete(path: String, trash: bool) -> Result<()> {
    let path = PathBuf::from(path);
    if path.exists() {
        if trash {
            #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos",))]
            {
                ::trash::delete(path)?;
            }
            #[cfg(all(
                not(target_os = "windows"),
                not(target_os = "linux"),
                not(target_os = "macos")
            ))]
            {
                return Err(anyhow::anyhow!("not support delete to trash"));
            }
        } else if path.is_file() {
            fs_extra::file::remove(path)?;
        } else {
            fs_extra::dir::remove(path)?;
        }
    }
    Ok(())
}

#[command("fs")]
fn r#move(src_path: String, target_path: String, r#override: bool) -> Result<()> {
    let src_path = PathBuf::from(src_path);
    let target_path = PathBuf::from(target_path);
    if src_path.exists() {
        fs_utils::r#move(src_path, target_path, r#override)?;
        Ok(())
    } else {
        Err(anyhow::anyhow!("src path notfound: {}", src_path.display()))
    }
}

#[command("fs")]
fn copy(src_path: String, target_path: String, r#override: bool) -> Result<()> {
    let src_path = PathBuf::from(src_path);
    let target_path = PathBuf::from(target_path);
    if src_path.exists() {
        fs_utils::copy(src_path, target_path, r#override)?;
        Ok(())
    } else {
        Err(anyhow::anyhow!("src path notfound: {}", src_path.display()))
    }
}

#[command("fs")]
fn write(path: String, contents: String) -> Result<()> {
    fs::write(path, contents)?;
    Ok(())
}

#[command("fs")]
fn show_in_folder(path: String) -> Result<()> {
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos",))]
    {
        use std::process::Command;
        #[cfg(target_os = "windows")]
        let path = path.replace("/", "\\");
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        let path = path.replace("\\", "/");
        let path = PathBuf::from(&path);
        let path = if path.exists() {
            Some(path.to_str().unwrap().to_string())
        } else if path.parent().is_some() && path.parent().unwrap().exists() {
            Some(path.parent().unwrap().to_str().unwrap().to_string())
        } else {
            None
        };
        if path.is_none() {
            return Ok(());
        }
        let path = path.unwrap();

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("explorer")
                .creation_flags(CREATE_NO_WINDOW)
                .args(["/select,", &path]) // The comma after select is not a typo
                .spawn()?;
        }

        #[cfg(target_os = "linux")]
        {
            use fork::{daemon, Fork};
            use std::{fs::metadata, path::PathBuf};

            if path.contains(",") {
                // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
                let new_path = match metadata(&path)?.is_dir() {
                    true => path,
                    false => {
                        let mut path2 = PathBuf::from(path);
                        path2.pop();
                        path2
                            .into_os_string()
                            .into_string()
                            .map_err(|err| anyhow::anyhow!(format!("{:?}", err)))?
                    }
                };
                Command::new("xdg-open").arg(&new_path).spawn()?;
            } else if let Ok(Fork::Child) = daemon(false, false) {
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

        #[cfg(target_os = "macos")]
        {
            if std::fs::exists(&path).unwrap_or(false) {
                Command::new("open").args(["-R", &path]).spawn()?;
            }
        }
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SelectDialogFilter {
    /// "text"
    name: String,
    /// ["txt", "rs"]
    extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum SelectDialogType {
    #[serde(rename = "openFile")]
    OpenFile,
    #[serde(rename = "openFiles")]
    OpenFiles,
    #[serde(rename = "openFolder")]
    OpenFolder,
    #[serde(rename = "openFolders")]
    OpenFolders,
    #[serde(rename = "saveFile")]
    SaveFile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SelectDialogArgs {
    #[serde(rename = "type")]
    r#type: SelectDialogType,
    title: Option<String>,
    filters: Option<Vec<SelectDialogFilter>>,
    default_directory: Option<String>,
    default_file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SelectDialogResult {
    paths: Option<Vec<String>>,
    path: Option<String>,
}

#[command("fs")]
async fn show_select_dialog(Json(args): Json<SelectDialogArgs>) -> Result<SelectDialogResult> {
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos",))]
    {
        use rfd::AsyncFileDialog;
        let mut file = AsyncFileDialog::new();
        if let Some(title) = args.title {
            file = file.set_title(title);
        };
        if let Some(default_directory) = args.default_directory {
            file = file.set_directory(default_directory);
        };
        if let Some(default_file_name) = args.default_file_name {
            file = file.set_file_name(default_file_name);
        };
        if let Some(filters) = args.filters {
            for f in filters.into_iter() {
                file = file.add_filter(f.name, &f.extensions);
            }
        };
        match args.r#type {
            SelectDialogType::OpenFile => {
                let f = file.pick_file().await;
                match f {
                    Some(f) => Ok(SelectDialogResult {
                        path: Some(f.path().display().to_string()),
                        paths: None,
                    }),
                    None => Ok(SelectDialogResult {
                        path: None,
                        paths: None,
                    }),
                }
            }
            SelectDialogType::OpenFiles => {
                let files = file.pick_files().await;
                match files {
                    Some(fs) => Ok(SelectDialogResult {
                        path: None,
                        paths: Some(
                            fs.iter()
                                .map(|f| f.path().display().to_string())
                                .collect::<Vec<String>>(),
                        ),
                    }),
                    None => Ok(SelectDialogResult {
                        path: None,
                        paths: None,
                    }),
                }
            }
            SelectDialogType::OpenFolder => {
                let f = file.pick_folder().await;
                match f {
                    Some(f) => Ok(SelectDialogResult {
                        path: Some(f.path().display().to_string()),
                        paths: None,
                    }),
                    None => Ok(SelectDialogResult {
                        path: None,
                        paths: None,
                    }),
                }
            }
            SelectDialogType::OpenFolders => {
                let folders = file.pick_folders().await;
                match folders {
                    Some(fs) => Ok(SelectDialogResult {
                        path: None,
                        paths: Some(
                            fs.iter()
                                .map(|f| f.path().display().to_string())
                                .collect::<Vec<String>>(),
                        ),
                    }),
                    None => Ok(SelectDialogResult {
                        path: None,
                        paths: None,
                    }),
                }
            }
            SelectDialogType::SaveFile => {
                let f = file.save_file().await;
                match f {
                    Some(f) => Ok(SelectDialogResult {
                        path: Some(f.path().display().to_string()),
                        paths: None,
                    }),
                    None => Ok(SelectDialogResult {
                        path: None,
                        paths: None,
                    }),
                }
            }
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos",)))]
    {
        Ok(CommandResponse::None)
    }
}

#[command("fs")]
async fn save_image_url_to_file(image_url: String, file_path: String) -> Result<()> {
    use futures::StreamExt;

    let client = reqwest::Client::new();
    let response = client.get(image_url).send().await?;
    if !response.status().is_success() {
        anyhow::bail!("request error: {}", response.status());
    }

    let mut file = fs::File::create(file_path)?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk)?;
    }

    Ok(())
}

#[command("fs")]
fn get_file_list(path: String, recursive: bool) -> Vec<String> {
    let path = PathBuf::from(path);
    let mut list = Vec::new();
    if !path.exists() || !path.is_dir() {
        return list;
    }
    let depth = if recursive { usize::MAX } else { 1 };
    for entry in WalkDir::new(&path)
        .max_depth(depth)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_file())
    {
        list.push(entry.path().display().to_string());
    }
    list
}
