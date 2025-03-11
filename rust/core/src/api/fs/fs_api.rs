use std::{fs, path::PathBuf};

use anyhow::Result;
use lonanote_commands::{
    body::Json,
    reg_command, reg_command_async,
    result::{CommandResponse, CommandResult},
};
use rfd::AsyncFileDialog;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PathArg {
    path: String,
}

fn exists(Json(args): Json<PathArg>) -> CommandResult {
    let path = PathBuf::from(args.path);
    let exists = path.exists();
    CommandResponse::json(exists)
}

fn is_dir(Json(args): Json<PathArg>) -> CommandResult {
    let path = PathBuf::from(args.path);
    let is_dir = path.exists() && path.is_dir();
    CommandResponse::json(is_dir)
}

fn is_file(Json(args): Json<PathArg>) -> CommandResult {
    let path = PathBuf::from(args.path);
    let is_file = path.exists() && path.is_file();
    CommandResponse::json(is_file)
}

fn read_to_string(Json(args): Json<PathArg>) -> CommandResult {
    let s = fs::read_to_string(args.path)?;
    CommandResponse::json(s)
}

fn read_binary(Json(args): Json<PathArg>) -> CommandResult {
    let s = fs::read(args.path)?;
    CommandResponse::json(s)
}

fn create_dir(Json(args): Json<PathArg>) -> CommandResult {
    if !PathBuf::from(&args.path).exists() {
        fs::create_dir(args.path)?;
    }
    Ok(CommandResponse::None)
}

fn create_dir_all(Json(args): Json<PathArg>) -> CommandResult {
    if !PathBuf::from(&args.path).exists() {
        fs::create_dir_all(args.path)?;
    }
    Ok(CommandResponse::None)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteArg {
    path: String,
    contents: String,
}

fn write(Json(args): Json<WriteArg>) -> CommandResult {
    fs::write(args.path, args.contents)?;
    Ok(CommandResponse::None)
}

fn show_in_folder(Json(args): Json<PathArg>) -> CommandResult {
    use std::process::Command;
    let path = args.path;
    #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
    {
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
            return Ok(CommandResponse::None);
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

    Ok(CommandResponse::None)
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

async fn show_select_dialog(Json(args): Json<SelectDialogArgs>) -> CommandResult {
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
                Some(f) => CommandResponse::json(f.path().display().to_string()),
                None => Ok(CommandResponse::None),
            }
        }
        SelectDialogType::OpenFiles => {
            let files = file.pick_files().await;
            match files {
                Some(fs) => CommandResponse::json(
                    fs.iter()
                        .map(|f| f.path().display().to_string())
                        .collect::<Vec<String>>(),
                ),
                None => Ok(CommandResponse::None),
            }
        }
        SelectDialogType::OpenFolder => {
            let f = file.pick_folder().await;
            match f {
                Some(f) => CommandResponse::json(f.path().display().to_string()),
                None => Ok(CommandResponse::None),
            }
        }
        SelectDialogType::OpenFolders => {
            let folders = file.pick_folders().await;
            match folders {
                Some(fs) => CommandResponse::json(
                    fs.iter()
                        .map(|f| f.path().display().to_string())
                        .collect::<Vec<String>>(),
                ),
                None => Ok(CommandResponse::None),
            }
        }
        SelectDialogType::SaveFile => {
            let f = file.save_file().await;
            match f {
                Some(f) => CommandResponse::json(f.path().display().to_string()),
                None => Ok(CommandResponse::None),
            }
        }
    }
}

pub fn reg_commands() -> Result<()> {
    reg_command("fs.exists", exists)?;
    reg_command("fs.is_dir", is_dir)?;
    reg_command("fs.is_file", is_file)?;
    reg_command("fs.read_to_string", read_to_string)?;
    reg_command("fs.read_binary", read_binary)?;
    reg_command("fs.create_dir", create_dir)?;
    reg_command("fs.create_dir_all", create_dir_all)?;
    reg_command("fs.write", write)?;
    reg_command("fs.show_in_folder", show_in_folder)?;
    reg_command_async("fs.show_select_dialog", show_select_dialog)?;

    Ok(())
}
