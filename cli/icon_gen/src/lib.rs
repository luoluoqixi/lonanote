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
    process::Command,
    sync::LazyLock,
};

static CURRENT_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap() // /release
        .parent()
        .unwrap() // /target
        .parent()
        .unwrap() // /cli
        .to_path_buf()
});

static UI_PATH: LazyLock<PathBuf> = LazyLock::new(|| CURRENT_PATH.join("../ui"));
static RS_PATH: LazyLock<PathBuf> = LazyLock::new(|| CURRENT_PATH.join("../rust"));
static RES_PATH: LazyLock<PathBuf> = LazyLock::new(|| CURRENT_PATH.join("../resources"));
static INPUT_ICON_PATH: LazyLock<PathBuf> = LazyLock::new(|| RES_PATH.join("icons/icon.png"));

struct IcnsConf {
    name: String,
    size: u32,
    ostype: String,
}

struct AndroidConf {
    name: String,
    size: u32,
    foreground_size: u32,
}

struct IOSConf {
    size: f32,
    multipliers: Vec<u32>,
    has_extra: bool,
}

static ICNS_CONF: LazyLock<Vec<IcnsConf>> = LazyLock::new(|| {
    vec![
        IcnsConf {
            name: "16x16".to_string(),
            size: 16,
            ostype: "is32".to_string(),
        },
        IcnsConf {
            name: "16x16@2x".to_string(),
            size: 32,
            ostype: "ic11".to_string(),
        },
        IcnsConf {
            name: "32x32".to_string(),
            size: 32,
            ostype: "il32".to_string(),
        },
        IcnsConf {
            name: "32x32@2x".to_string(),
            size: 64,
            ostype: "ic12".to_string(),
        },
        IcnsConf {
            name: "128x128".to_string(),
            size: 128,
            ostype: "ic07".to_string(),
        },
        IcnsConf {
            name: "128x128@2x".to_string(),
            size: 256,
            ostype: "ic13".to_string(),
        },
        IcnsConf {
            name: "256x256".to_string(),
            size: 256,
            ostype: "ic08".to_string(),
        },
        IcnsConf {
            name: "256x256@2x".to_string(),
            size: 512,
            ostype: "ic14".to_string(),
        },
        IcnsConf {
            name: "512x512".to_string(),
            size: 512,
            ostype: "ic09".to_string(),
        },
        IcnsConf {
            name: "512x512@2x".to_string(),
            size: 1024,
            ostype: "ic10".to_string(),
        },
    ]
});

static TAURI_ANDROID_CONF: LazyLock<Vec<AndroidConf>> = LazyLock::new(|| {
    vec![
        AndroidConf {
            name: "hdpi".to_string(),
            size: 49,
            foreground_size: 162,
        },
        AndroidConf {
            name: "mdpi".to_string(),
            size: 48,
            foreground_size: 108,
        },
        AndroidConf {
            name: "xhdpi".to_string(),
            size: 96,
            foreground_size: 216,
        },
        AndroidConf {
            name: "xxhdpi".to_string(),
            size: 144,
            foreground_size: 324,
        },
        AndroidConf {
            name: "xxxhdpi".to_string(),
            size: 192,
            foreground_size: 432,
        },
    ]
});

static TAURI_IOS_CONF: LazyLock<Vec<IOSConf>> = LazyLock::new(|| {
    vec![
        IOSConf {
            size: 20.0,
            multipliers: vec![1, 2, 3],
            has_extra: true,
        },
        IOSConf {
            size: 29.0,
            multipliers: vec![1, 2, 3],
            has_extra: true,
        },
        IOSConf {
            size: 40.0,
            multipliers: vec![1, 2, 3],
            has_extra: true,
        },
        IOSConf {
            size: 60.0,
            multipliers: vec![2, 3],
            has_extra: false,
        },
        IOSConf {
            size: 76.0,
            multipliers: vec![1, 2],
            has_extra: false,
        },
        IOSConf {
            size: 83.5,
            multipliers: vec![2],
            has_extra: false,
        },
        IOSConf {
            size: 512.0,
            multipliers: vec![2],
            has_extra: false,
        },
    ]
});

fn process_image(
    image_path: &Path,
    output_path: &Path,
    mask_path: Option<&Path>,
    blank_size: Option<u32>,
    resize: Option<(u32, u32)>,
    prefix: Option<&String>,
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
        "generate icon {}{}",
        prefix.unwrap_or(&String::new()),
        output_path.file_stem().unwrap().to_str().unwrap()
    );
    Ok(())
}

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
        for conf in ICNS_CONF.iter() {
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

            let image = icns::Image::read_png(&buf[..])
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

fn process_tauri_android(
    image_path: &Path,
    android_path: &Path,
    mask_path: Option<&Path>,
    blank_size: Option<u32>,
) -> Result<()> {
    let res_path = android_path.join("app/src/main/res");
    for conf in TAURI_ANDROID_CONF.iter() {
        let folder_name = format!("mipmap-{}/", &conf.name);
        let out_folder = res_path.join(&folder_name);
        if !out_folder.exists() {
            std::fs::create_dir_all(&out_folder).unwrap_or_else(|_| {
                panic!("create folder error: {}", out_folder.to_str().unwrap())
            });
        }
        let file_name = "ic_launcher_foreground.png";
        let output_path = out_folder.join(file_name);
        process_image(
            image_path,
            &output_path,
            mask_path,
            blank_size,
            Some((conf.foreground_size, conf.foreground_size)),
            Some(&folder_name),
        )?;
        let file_name = "ic_launcher_round.png";
        let output_path = out_folder.join(file_name);
        process_image(
            image_path,
            &output_path,
            mask_path,
            blank_size,
            Some((conf.size, conf.size)),
            Some(&folder_name),
        )?;
        let file_name = "ic_launcher.png";
        let output_path = out_folder.join(file_name);
        process_image(
            image_path,
            &output_path,
            mask_path,
            blank_size,
            Some((conf.size, conf.size)),
            Some(&folder_name),
        )?;
    }

    Ok(())
}

fn process_tauri_ios(
    image_path: &Path,
    ios_path: &Path,
    mask_path: Option<&Path>,
    blank_size: Option<u32>,
) -> Result<()> {
    let icon_path = ios_path.join("Assets.xcassets/AppIcon.appiconset");
    if !icon_path.exists() {
        std::fs::create_dir_all(&icon_path)
            .unwrap_or_else(|_| panic!("create dir error: {}", icon_path.to_str().unwrap()));
    }
    for conf in TAURI_IOS_CONF.iter() {
        let size_str = if (conf.size - 512.0).abs() < 0.01 {
            "512".to_string()
        } else {
            format!("{}x{}", conf.size, conf.size)
        };
        if conf.has_extra {
            let size = (conf.size * 2.0).round() as u32;
            let file_name = format!("AppIcon-{size_str}@2x-1.png");
            let output_path = icon_path.join(file_name);
            process_image(
                image_path,
                &output_path,
                mask_path,
                blank_size,
                Some((size, size)),
                None,
            )?;
        }
        for multiplier in conf.multipliers.iter() {
            let size = (conf.size * (*multiplier as f32)).round() as u32;
            let file_name = format!("AppIcon-{size_str}@{multiplier}x.png");
            let output_path = icon_path.join(file_name);
            process_image(
                image_path,
                &output_path,
                mask_path,
                blank_size,
                Some((size, size)),
                None,
            )?;
        }
    }

    Ok(())
}

#[allow(dead_code)]
fn generate_tauri_icon(input_path: &Path, default_mask: &Option<PathBuf>) -> Result<()> {
    let mobile_path = &RS_PATH.join("mobile");
    let android_path = &mobile_path.join("gen/android");
    let ios_path = &mobile_path.join("gen/apple");

    // android
    process_tauri_android(input_path, android_path, default_mask.as_deref(), None)?;
    // ios
    process_tauri_ios(input_path, ios_path, None, None)?;

    Ok(())
}

fn start_flutter_launcher_icons(flutter_project_path: &PathBuf) -> Result<()> {
    // dart run flutter_launcher_icons
    std::env::set_current_dir(flutter_project_path)?;
    let dart_command = if cfg!(target_os = "windows") {
        "dart.bat"
    } else {
        "dart"
    };
    let status = Command::new(dart_command)
        .args(["run", "flutter_launcher_icons"])
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .status()?;
    if !status.success() {
        Err(anyhow::anyhow!("[dart run flutter_launcher_icons] error"))
    } else {
        info!("dart run flutter_launcher_icons success");
        Ok(())
    }
}

fn generate_flutter_icon(input_path: &Path, default_mask: &Option<PathBuf>) -> Result<()> {
    let flutter_path = &UI_PATH.join("flutter");
    let android_icon_path = &flutter_path.join("assets/icons/icon_android.png");
    let ios_path = &flutter_path.join("assets/icons/icon_ios.png");
    let win_icon_path = &flutter_path.join("assets/icons/icon_win.png");
    let mac_path = &flutter_path.join("assets/icons/icon_mac.png");

    // android
    process_image(
        input_path,
        android_icon_path,
        default_mask.as_deref(),
        None,
        None,
        None,
    )?;

    // ios
    process_image(input_path, ios_path, None, None, None, None)?;

    // windows
    process_image(
        input_path,
        win_icon_path,
        default_mask.as_deref(),
        None,
        None,
        None,
    )?;
    // mac
    process_image(
        input_path,
        mac_path,
        default_mask.as_deref(),
        Some(100),
        Some((1024, 1024)),
        None,
    )?;

    start_flutter_launcher_icons(flutter_path)?;

    Ok(())
}

pub fn generate_icons() -> Result<()> {
    let input_path = &INPUT_ICON_PATH.to_path_buf();
    let input_folder = &input_path.parent().unwrap().to_path_buf();

    let default_workspace_icon_path =
        &RS_PATH.join("core/assets/default_workspace/assets/images/icon.png");

    let default_mask = Some(input_folder.join("mask.png"));

    // default_workspace
    process_image(
        input_path,
        default_workspace_icon_path,
        default_mask.as_deref(),
        None,
        None,
        None,
    )?;

    // generate_tauri_icon(input_path, &default_mask)?;
    generate_flutter_icon(input_path, &default_mask)?;

    info!("all finish!");

    Ok(())
}
