use std::{
    fs,
    io::{Read, Write},
    path::PathBuf,
};

use anyhow::Result;
use lonanote_commands::{
    body::Json,
    reg_command, reg_command_async,
    result::{CommandResponse, CommandResult},
};
use rfd::AsyncFileDialog;
use serde::{Deserialize, Serialize};

use crate::utils::{self, fs_utils};

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
    // let s = fs::read_to_string(args.path)?;
    let mut file = fs::File::open(args.path)?;
    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    let contents = utils::read_string(&buf);
    CommandResponse::json(contents)
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

fn create_file(Json(args): Json<WriteArg>) -> CommandResult {
    let path = PathBuf::from(&args.path);
    if path.exists() {
        return Err(anyhow::anyhow!("path already exists: {}", path.display()));
    }
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, args.contents)?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow::anyhow!("path parent is None: {}", path.display()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteArg {
    path: String,
    trash: bool,
}

fn delete(Json(args): Json<DeleteArg>) -> CommandResult {
    let path = PathBuf::from(args.path);
    if path.exists() {
        if args.trash {
            #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos",))]
            {
                use trash;
                trash::delete(path)?;
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
    Ok(CommandResponse::None)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyArg {
    src_path: String,
    target_path: String,
    #[serde(rename = "override")]
    r#override: bool,
}

fn r#move(Json(args): Json<CopyArg>) -> CommandResult {
    let src_path = PathBuf::from(args.src_path);
    let target_path = PathBuf::from(args.target_path);
    if src_path.exists() {
        fs_utils::r#move(src_path, target_path, args.r#override)?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow::anyhow!("src path notfound: {}", src_path.display()))
    }
}

fn copy(Json(args): Json<CopyArg>) -> CommandResult {
    let src_path = PathBuf::from(args.src_path);
    let target_path = PathBuf::from(args.target_path);
    if src_path.exists() {
        fs_utils::copy(src_path, target_path, args.r#override)?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow::anyhow!("src path notfound: {}", src_path.display()))
    }
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
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos",))]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveImageUrlToFileArgs {
    image_url: String,
    file_path: String,
}

async fn save_image_url_to_file(Json(args): Json<SaveImageUrlToFileArgs>) -> CommandResult {
    use futures::StreamExt;

    let img_url = args.image_url;
    let file_path = args.file_path;

    let client = reqwest::Client::new();
    let response = client.get(img_url).send().await?;
    if !response.status().is_success() {
        anyhow::bail!("request error: {}", response.status());
    }

    let mut file = fs::File::create(file_path)?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk)?;
    }

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command("fs.exists", exists)?;
    reg_command("fs.is_dir", is_dir)?;
    reg_command("fs.is_file", is_file)?;
    reg_command("fs.read_to_string", read_to_string)?;
    reg_command("fs.read_binary", read_binary)?;
    reg_command("fs.create_dir", create_dir)?;
    reg_command("fs.create_dir_all", create_dir_all)?;
    reg_command("fs.create_file", create_file)?;
    reg_command("fs.delete", delete)?;
    reg_command("fs.move", r#move)?;
    reg_command("fs.copy", copy)?;
    reg_command("fs.write", write)?;
    reg_command("fs.show_in_folder", show_in_folder)?;
    reg_command_async("fs.show_select_dialog", show_select_dialog)?;
    reg_command_async("fs.save_image_url_to_file", save_image_url_to_file)?;

    Ok(())
}
