#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs
import os
import sys
import pathlib
import shutil
import zipfile

import utils

def zip_file(folder_path, target_zip_path):
    with zipfile.ZipFile(target_zip_path, 'w', zipfile.ZIP_LZMA) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, folder_path))

def get_current_version():
    tags = utils.subprocess_check_output(["git", "tag"])
    tags = tags.split("\n")
    versions = []
    for tag in tags:
        if not tag.startswith("v") or "-" in tag:
            continue
        versions.append(tag[1:])
    versions.sort(key=lambda x:tuple(int(v) for v in x.split(".")))
    last_version = versions.pop();
    return last_version

def get_output_file_path(repo_root, build_dir, build_name, release_title, suffix):
    return os.path.join(repo_root, build_dir, f"{build_name}-{release_title}-{suffix}")

def zip_folder_to_file(dist_folder, output_file):
    output_file_path = pathlib.Path(output_file)
    file_stem = output_file_path.stem
    dir_folder = os.path.dirname(output_file)
    dir_folder_path = pathlib.Path(dir_folder)

    if not dir_folder_path.exists():
        print(f"mkdir {dir_folder_path}")
        dir_folder_path.mkdir(parents=True)

    target_folder = os.path.join(dir_folder, file_stem)
    if os.path.exists(target_folder):
        print(f"delete target_folder: {target_folder}")
        shutil.rmtree(target_folder)
    print(f"move {dist_folder} to {target_folder}")
    shutil.move(dist_folder, target_folder)

    print(f"zip {target_folder} to {output_file}")

    zip_file(target_folder, output_file)

def move_file_to_file(dist_file, output_file):
    output_file_path = pathlib.Path(output_file)
    dir_folder = os.path.dirname(output_file)
    dir_folder_path = pathlib.Path(dir_folder)
    if not dir_folder_path.exists():
        print(f"mkdir {dir_folder_path}")
        dir_folder_path.mkdir(parents=True)
    if os.path.exists(output_file_path):
        print(f"delete target_file: {output_file_path}")
        os.remove(output_file_path)
        # shutil.rmtree(output_file_path)
    print(f"move {dist_file} to {output_file_path}")
    shutil.move(dist_file, output_file_path)

def build(repo_root, runner_name, build_dir, build_name, release_title, suffix):
    if build_dir is None:
        build_dir = "build_output"

    if build_name is None:
        build_name = "lonanote"

    if release_title is None:
        release_title = f"v{get_current_version()}"
        print(f"get current version: {release_title}")

    version = release_title[1:]

    platform = None
    if runner_name is not None:
        if runner_name == "build linux":
            platform = "linux"
        elif runner_name == "build windows":
            platform = "win"
        elif runner_name == "build mac-arm64":
            platform = "mac"
        elif runner_name == "build mac-x64":
            platform = "mac"
    if platform is None:
        sys_platform = sys.platform
        if sys_platform == "win32":
            platform = "win"
        elif sys_platform == "darwin":
            platform = "mac"
        elif sys_platform == "linux":
            platform = "linux"

    print("pnpm -C ui install...")
    if platform == "win":
        utils.subprocess_run(["cmd", "/c", "pnpm", "-C", "ui", "install"], working_dir=repo_root)
    else:
        utils.subprocess_run(["pnpm", "-C", "ui", "install"], working_dir=repo_root)
    print("pnpm -C ui install finish")

    print(f"pnpm -C ui build:{platform}...")
    if platform == "win":
        utils.subprocess_run(["cmd", "/c", "pnpm", "-C", "ui", f"build:{platform}"], working_dir=repo_root)
    else:
        utils.subprocess_run(["pnpm", "-C", "ui", f"build:{platform}"], working_dir=repo_root)
    print(f"pnpm -C ui build:{platform} finish")

    # zip output
    if platform == "win":
        if suffix is None:
            suffix = "windows.exe"
        dist_exe = os.path.join(repo_root, f"ui/packages/desktop/dist/lonanote Setup {version}.exe")
        output_file = get_output_file_path(repo_root, build_dir, build_name, release_title, suffix)
        move_file_to_file(dist_exe, output_file)
    elif platform == "mac":
        if suffix is None:
            suffix = "mac-arm64.zip"
        dist_suffix = ""
        if runner_name == "build mac-arm64":
            dist_suffix = "-arm64"
        elif runner_name == "build mac-x64":
            dist_suffix = ""
        dist_dmg = os.path.join(
            repo_root, f"ui/packages/desktop/dist/lonanote-{version}{dist_suffix}.dmg"
        )
        output_file = get_output_file_path(repo_root, build_dir, build_name, release_title, suffix)
        move_file_to_file(dist_dmg, output_file)

def main():
    # 修复 windows 编码问题
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

    repo_root = os.environ.get('GITHUB_WORKSPACE')
    release_title = os.environ.get('RELEASE_TITLE')
    build_dir = os.environ.get('BUILD_DIR')
    build_name = os.environ.get('BUILD_NAME')
    runner_os = os.environ.get('RUNNER_OS')
    runner_name = os.environ.get("RUNNER_CONFIG_NAME")
    suffix = os.environ.get('SUFFIX')

    current_dir = os.getcwd()

    if repo_root is None:
        repo_root = utils.REPO_ROOT

    print(f"仓库根目录: {repo_root}")
    print(f"当前工作目录: {current_dir}")
    print(f"当前 Release 标题: {release_title}")
    print(f"build_dir: {build_dir}")
    print(f"build_name: {build_name}")
    print(f"runner_os: {runner_os}")
    print(f"runner_name: {runner_name}")
    print(f"suffix: {suffix}")

    build(repo_root, runner_name, build_dir, build_name, release_title, suffix)

if __name__ == '__main__':
    main()
