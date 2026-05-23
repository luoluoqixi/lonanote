mod config;

use anyhow::Result;
use image::{
    codecs::{
        ico::IcoFrame,
        png::{CompressionType, FilterType, PngEncoder},
    },
    EncodableLayout, ExtendedColorType, Rgba, RgbaImage,
};
use log::info;
use std::{
    io::BufWriter,
    path::{Path, PathBuf},
};

use crate::config::{GenerateIconType, GenerateTarget, IconTransformConf, ICON_CONFIG, REPO_PATH};

fn save_img(img: &RgbaImage, file_path: &Path) -> Result<()> {
    let parent_dir = file_path
        .parent()
        .unwrap_or_else(|| panic!("notfound path parent: {}", file_path.to_str().unwrap()));
    if !parent_dir.exists() {
        std::fs::create_dir_all(parent_dir)
            .unwrap_or_else(|_| panic!("create dir error: {}", parent_dir.to_str().unwrap()));
    }
    let file = std::fs::File::create(file_path)?;
    let writer = BufWriter::new(file);
    let lower_file_path = file_path.to_str().unwrap().to_lowercase();
    if lower_file_path.ends_with(".png") {
        let encoder =
            PngEncoder::new_with_quality(writer, CompressionType::Best, FilterType::NoFilter);
        img.write_with_encoder(encoder)?;
    } else if lower_file_path.ends_with(".ico") {
        let mut frames = Vec::new();
        for size in [32, 16, 24, 48, 64, 256] {
            let resized_img =
                image::imageops::resize(img, size, size, image::imageops::FilterType::Lanczos3);
            let buf = resized_img.as_bytes();
            frames.push(IcoFrame::as_png(buf, size, size, ExtendedColorType::Rgba8)?);
        }
        image::codecs::ico::IcoEncoder::new(writer).encode_images(&frames)?;
    } else if lower_file_path.ends_with(".icns") {
        let mut family = icns::IconFamily::new();
        for conf in config::ICNS_CONF.iter() {
            let _name = &conf.name;
            let size = &conf.size;
            let ostype = &conf.ostype;
            let resized_img =
                image::imageops::resize(img, *size, *size, image::imageops::FilterType::Lanczos3);

            let mut buf = Vec::new();
            let writer = std::io::BufWriter::new(&mut buf);
            let encoder =
                PngEncoder::new_with_quality(writer, CompressionType::Best, FilterType::NoFilter);
            resized_img.write_with_encoder(encoder)?;

            let cursor = std::io::Cursor::new(buf);
            let image = icns::Image::read_png(cursor)
                .map_err(|e| anyhow::anyhow!("read png icon to icns error: {e:#?}"))?;
            family
                .add_icon_with_type(
                    &image,
                    icns::IconType::from_ostype(ostype.parse().unwrap()).unwrap(),
                )
                .map_err(|e| anyhow::anyhow!("add icns icon error: {e:#?}"))?;
        }
        family
            .write(writer)
            .map_err(|e| anyhow::anyhow!("icns write error: {e:#?}"))?;
    };

    Ok(())
}

/// mask
fn apply_mask(img: &mut RgbaImage, mask: &RgbaImage) {
    let (width, height) = img.dimensions();
    let (mask_width, mask_height) = mask.dimensions();

    if width != mask_width || height != mask_height {
        panic!("Image and mask dimensions do not match!");
    }
    for y in 0..height {
        for x in 0..width {
            let img_pixel = img.get_pixel(x, y);
            let mask_pixel = mask.get_pixel(x, y);
            let mask_alpha = mask_pixel[3];
            let blended_pixel = Rgba([img_pixel[0], img_pixel[1], img_pixel[2], mask_alpha]);
            img.put_pixel(x, y, blended_pixel);
        }
    }
}

/// blank
fn add_blank(img: &RgbaImage, blank_size: u32) -> RgbaImage {
    let (width, height) = img.dimensions();
    let new_width = width - 2 * blank_size;
    let new_height = height - 2 * blank_size;
    if new_width == 0 || new_height == 0 {
        panic!("Blank size is too large for the image dimensions.");
    }
    let resized_img = image::imageops::resize(
        img,
        new_width,
        new_height,
        image::imageops::FilterType::Lanczos3,
    );
    let mut bordered_img = RgbaImage::new(width, height);
    for y in 0..new_height {
        for x in 0..new_width {
            let pixel = resized_img.get_pixel(x, y);
            bordered_img.put_pixel(x + blank_size, y + blank_size, *pixel);
        }
    }
    bordered_img
}

fn process_image(
    name: &str,
    image_path: &Path,
    output_path: &Path,
    mask_path: &Option<PathBuf>,
    blank_size: Option<u32>,
    resize: Option<(u32, u32)>,
) -> Result<()> {
    let mut img = image::open(image_path)?.into_rgba8();
    if let Some(mask_path) = mask_path {
        let mask = image::open(mask_path)?.into_rgba8();
        apply_mask(&mut img, &mask);
    }
    if let Some(blank_size) = blank_size {
        img = add_blank(&img, blank_size);
    }
    if let Some(target_size) = resize {
        img = image::imageops::resize(
            &img,
            target_size.0,
            target_size.1,
            image::imageops::FilterType::Lanczos3,
        );
    }
    save_img(&img, output_path)?;
    info!(
        "generate {} icon {}",
        name,
        output_path.file_stem().unwrap().to_str().unwrap()
    );
    Ok(())
}

fn process_image_transform(
    name: &str,
    image_path: &Path,
    output_path: &Path,
    default_mask: Option<&PathBuf>,
    transform: Option<&IconTransformConf>,
) -> Result<()> {
    fn get_mask_path<'a>(
        transform: Option<&'a IconTransformConf>,
        default_mask: Option<&'a PathBuf>,
    ) -> Option<PathBuf> {
        if let Some(transform) = transform {
            if let Some(custom_mask) = &transform.custom_mask {
                Some(REPO_PATH.join(custom_mask))
            } else if transform.default_mask.unwrap_or(false) {
                default_mask.cloned()
            } else {
                None
            }
        } else {
            None
        }
    }
    let mask_path = get_mask_path(transform, default_mask);
    let blank_size = transform.and_then(|t| t.blank_size);
    let resize = transform
        .and_then(|t| t.resize.clone())
        .map(|s| (s.width, s.height));

    process_image(
        name,
        image_path,
        output_path,
        &mask_path,
        blank_size,
        resize,
    )
}

#[allow(clippy::too_many_arguments)]
fn generate_platform_icons(
    name: &str,
    input_path: &Path,
    output_path: &Path,
    default_mask: Option<&PathBuf>,
    transform: Option<&IconTransformConf>,
    transform_win: Option<&IconTransformConf>,
    transform_mac: Option<&IconTransformConf>,
    transform_linux: Option<&IconTransformConf>,
    transform_android: Option<&IconTransformConf>,
    transform_ios: Option<&IconTransformConf>,
) -> Result<(PathBuf, PathBuf, PathBuf, PathBuf, PathBuf)> {
    let win_icon_path = output_path.join("icon_win.png");
    let mac_path = output_path.join("icon_mac.png");
    let linux_path = output_path.join("icon_linux.png");
    let android_icon_path = output_path.join("icon_android.png");
    let ios_path = output_path.join("icon_ios.png");

    let generate_icon =
        |platform: &str, output: &Path, tr: Option<&IconTransformConf>| -> Result<()> {
            info!("generate flutter {} icon to {:?}", platform, tr);
            process_image_transform(
                format!("{} {}", name, platform).as_str(),
                input_path,
                output,
                default_mask,
                tr.or(transform),
            )
        };

    // windows
    generate_icon("windows", &win_icon_path, transform_win)?;
    // mac
    generate_icon("macos", &mac_path, transform_mac)?;
    // linux
    generate_icon("linux", &linux_path, transform_linux)?;
    // android
    generate_icon("android", &android_icon_path, transform_android)?;
    // ios
    generate_icon("ios", &ios_path, transform_ios)?;

    Ok((
        win_icon_path,
        mac_path,
        linux_path,
        android_icon_path,
        ios_path,
    ))
}

fn run_tauri_icons(
    tauri_project_path: &Path,
    icon_path: &Path,
    output_folder: &Path,
) -> Result<()> {
    // cargo tauri icon <icon_pathicon_path> --output <output_folder>
    let mut child = utils::cmd::run_command_which_println(
        "cargo",
        tauri_project_path.to_str().unwrap(),
        &[
            "tauri",
            "icon",
            icon_path.to_str().unwrap(),
            "--output",
            output_folder.to_str().unwrap(),
        ],
    )?;
    let status = child.wait()?;
    if !status.success() {
        Err(anyhow::anyhow!(
            "[cargo tauri icon {} --output {}] error",
            icon_path.display(),
            output_folder.display()
        ))
    } else {
        Ok(())
    }
}

#[allow(clippy::too_many_arguments)]
fn generate_tauri_icons(
    name: &str,
    targets: &Option<Vec<GenerateTarget>>,
    project_path: &Path,
    input_path: &Path,
    output_path: &Path,
    custom_tauri_icon_folder: Option<&String>,
    default_mask: Option<&PathBuf>,
    transform: Option<&IconTransformConf>,
    transform_win: Option<&IconTransformConf>,
    transform_mac: Option<&IconTransformConf>,
    transform_linux: Option<&IconTransformConf>,
    transform_android: Option<&IconTransformConf>,
    transform_ios: Option<&IconTransformConf>,
) -> Result<()> {
    let (win, mac, _, android, ios) = generate_platform_icons(
        name,
        input_path,
        output_path,
        default_mask,
        transform,
        transform_win,
        transform_mac,
        transform_linux,
        transform_android,
        transform_ios,
    )?;

    let generate_icon = |platform: &str, icon_path: &Path| -> Result<PathBuf> {
        let temp_folder = output_path.join("temp_icons");
        if !temp_folder.exists() {
            std::fs::create_dir_all(&temp_folder)
                .unwrap_or_else(|_| panic!("create dir error: {}", temp_folder.to_str().unwrap()));
        }
        run_tauri_icons(project_path, icon_path, &temp_folder)?;
        info!("run tauri {} icon success", platform);
        Ok(temp_folder)
    };

    let tauri_icon_folder =
        project_path.join(custom_tauri_icon_folder.unwrap_or(&"icons".to_string()));

    let all_targets = vec![
        GenerateTarget::Win,
        GenerateTarget::Mac,
        GenerateTarget::Linux,
        GenerateTarget::Android,
        GenerateTarget::Ios,
    ];
    let targets = targets.as_ref().unwrap_or(&all_targets);

    let is_windows = targets.iter().any(|t| matches!(t, GenerateTarget::Win));
    let is_macos = targets.iter().any(|t| matches!(t, GenerateTarget::Mac));
    let is_linux = targets.iter().any(|t| matches!(t, GenerateTarget::Linux));
    let is_android = targets.iter().any(|t| matches!(t, GenerateTarget::Android));
    let is_ios = targets.iter().any(|t| matches!(t, GenerateTarget::Ios));

    // windows and linux, linux use windows icon config
    if is_windows || is_linux {
        let output_dir = generate_icon("windows", &win)?;
        let readdir = std::fs::read_dir(&output_dir)
            .unwrap_or_else(|_| panic!("read dir error: {}", output_dir.to_str().unwrap()));

        for entry in readdir {
            let entry = entry?;
            let file_type = entry.file_type()?;
            if file_type.is_file() {
                let file_name = entry.file_name();
                let dest_path = tauri_icon_folder.join(file_name);
                utils::fs::copy(entry.path(), &dest_path)?;
                info!("tauri windows icon {}", dest_path.display());
            }
        }

        if output_dir.exists() {
            std::fs::remove_dir_all(output_dir)?;
        }
    }

    // macos
    if is_macos {
        let output_dir = generate_icon("macos", &mac)?;
        let mac_icon_path = output_dir.join("icon.icns");
        let dest_path = tauri_icon_folder.join(mac_icon_path.file_name().unwrap());
        utils::fs::copy(&mac_icon_path, &dest_path)?;
        info!("tauri macos icon {}", dest_path.display());

        if output_dir.exists() {
            std::fs::remove_dir_all(output_dir)?;
        }
    }

    // android
    if is_android {
        let output_dir = generate_icon("android", &android)?;
        let android_icon_path = output_dir.join("android");
        let android_dest_path = project_path.join("gen/android/app/src/main/res");
        utils::fs::copy(&android_icon_path, &android_dest_path)?;
        info!("tauri android icon {}", android_dest_path.display());
        if output_dir.exists() {
            std::fs::remove_dir_all(output_dir)?;
        }
    }

    // ios
    if is_ios {
        let output_dir = generate_icon("ios", &ios)?;
        let ios_icon_path = output_dir.join("ios");
        let ios_dest_path = project_path.join("gen/apple/Assets.xcassets/AppIcon.appiconset");
        utils::fs::copy(&ios_icon_path, &ios_dest_path)?;
        info!("tauri ios icon {}", ios_dest_path.display());
        if output_dir.exists() {
            std::fs::remove_dir_all(output_dir)?;
        }
    }

    Ok(())
}

fn run_flutter_launcher_icons(flutter_project_path: &Path) -> Result<()> {
    // dart run flutter_launcher_icons
    let mut child = utils::cmd::run_command_which_println(
        "dart",
        flutter_project_path.to_str().unwrap(),
        &["run", "flutter_launcher_icons"],
    )?;
    let status = child.wait()?;
    if !status.success() {
        Err(anyhow::anyhow!("[dart run flutter_launcher_icons] error"))
    } else {
        info!("dart run flutter_launcher_icons success");
        Ok(())
    }
}

#[allow(clippy::too_many_arguments)]
fn generate_flutter_icons(
    name: &str,
    project_path: &Path,
    input_path: &Path,
    output_path: &Path,
    default_mask: Option<&PathBuf>,
    transform: Option<&IconTransformConf>,
    transform_win: Option<&IconTransformConf>,
    transform_mac: Option<&IconTransformConf>,
    transform_linux: Option<&IconTransformConf>,
    transform_android: Option<&IconTransformConf>,
    transform_ios: Option<&IconTransformConf>,
) -> Result<()> {
    let _ = generate_platform_icons(
        name,
        input_path,
        output_path,
        default_mask,
        transform,
        transform_win,
        transform_mac,
        transform_linux,
        transform_android,
        transform_ios,
    )?;
    run_flutter_launcher_icons(project_path)?;

    Ok(())
}

fn generate_custom_icon(
    name: &str,
    input_path: &Path,
    output_path: &Path,
    default_mask: Option<&PathBuf>,
    transform: Option<&IconTransformConf>,
) -> Result<()> {
    process_image_transform(name, input_path, output_path, default_mask, transform)
}

pub fn generate_icons() -> Result<()> {
    let config = &ICON_CONFIG;
    let common = &config.common;

    let input_path = &config.common.icon;
    let input_path = REPO_PATH.join(input_path);

    let default_mask = config
        .common
        .mask_path
        .as_ref()
        .map(|mask_path| REPO_PATH.join(mask_path));

    for icon_conf in config.icons.iter() {
        let name = &icon_conf.name;
        let t = &icon_conf.r#type;
        let output_path = REPO_PATH.join(&icon_conf.output_path);
        let (
            transform,
            transform_win,
            transform_mac,
            transform_linux,
            transform_android,
            transform_ios,
        ) = icon_conf.get_transform(common);

        match t {
            GenerateIconType::Flutter => {
                if icon_conf.project_path.is_none() {
                    panic!("flutter icon must have project_path");
                }
                let project_path = icon_conf.project_path.as_ref().unwrap();
                let project_path = REPO_PATH.join(project_path);
                generate_flutter_icons(
                    name,
                    &project_path,
                    &input_path,
                    &output_path,
                    default_mask.as_ref(),
                    transform,
                    transform_win,
                    transform_mac,
                    transform_linux,
                    transform_android,
                    transform_ios,
                )?;
            }
            GenerateIconType::Tauri => {
                let targets = &icon_conf.targets;
                if icon_conf.project_path.is_none() {
                    panic!("tauri icon must have project_path");
                }
                let project_path = icon_conf.project_path.as_ref().unwrap();
                let project_path = REPO_PATH.join(project_path);
                generate_tauri_icons(
                    name,
                    targets,
                    &project_path,
                    &input_path,
                    &output_path,
                    common.custom_tauri_icon_folder.as_ref(),
                    default_mask.as_ref(),
                    transform,
                    transform_win,
                    transform_mac,
                    transform_linux,
                    transform_android,
                    transform_ios,
                )?;
            }
            GenerateIconType::Custom => {
                generate_custom_icon(
                    name,
                    &input_path,
                    &output_path,
                    default_mask.as_ref(),
                    transform,
                )?;
            }
        }
    }

    info!("all finish!");

    Ok(())
}
