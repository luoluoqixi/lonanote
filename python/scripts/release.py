#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs
import os
import sys
import argparse
import platform

import utils

COMMIT_MESSAGE = "🔖 release"

def check_convco_install():
    output = utils.subprocess_check_output(["convco", "--version"], throw_error=False)
    if output is None:
        print("convco is not installed")
        print("run [cargo install convco]")
        utils.subprocess_run(["cargo", "install", "--git", "https://github.com/lona-labs/convco.git"])
        utils.subprocess_run(["cargo", "install", "cargo-edit"])

def get_current_version(config_path):
    current_version = utils.subprocess_check_output(["convco", "version", "--config", config_path])
    if current_version is None:
        print("convco version failed, output is None")
        return None
    current_version = current_version.strip()
    return current_version

def get_next_version(config_path):
    next_version = utils.subprocess_check_output(["convco", "version", "--bump", "--config", config_path])
    if next_version is None:
        print("convco version --bump failed, output is None")
        return None
    next_version = next_version.strip()
    return next_version

def generate_changelog(repo_root, changelog_config_path, changelog_file, next_version):
    print("generate changelog...")
    changelog_path = os.path.join(repo_root, changelog_file)
    output = utils.subprocess_check_output(["convco", "changelog", "--unreleased", next_version, "--config", changelog_config_path])
    if output is None:
        raise RuntimeError(f"generate changelog error, output is None")
    with open(changelog_path, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"generate changelog finish: {changelog_path}")

def change_package_version(project_path, next_version):
    # pnpm version {version} --no-git-tag-version
    print("change package version...")
    if platform.system().lower() == "windows":
        utils.subprocess_check_output(["cmd", "/c", "pnpm", "version", next_version, "--no-git-tag-version", "--allow-same-version"], working_dir=project_path)
    else:
        utils.subprocess_check_output(["pnpm", "version", next_version, "--no-git-tag-version", "--allow-same-version"], working_dir=project_path)
    print(f"change package version finish: v{next_version}")

def change_cargo_version(project_path, next_version):
    # cargo install cargo-edit
    # cargo set-version {version}
    print("change cargo version...")
    utils.subprocess_check_output(["cargo", "set-version", next_version], working_dir=project_path)
    print(f"change cargo version finish: v{next_version}")

def change_version(repo_root, next_version):
    change_package_version(os.path.join(repo_root, "ui"), next_version)
    change_package_version(os.path.join(repo_root, "ui/packages/desktop"), next_version)
    change_package_version(os.path.join(repo_root, "ui/packages/editor"), next_version)
    change_package_version(os.path.join(repo_root, "ui/packages/renderer"), next_version)
    change_cargo_version(os.path.join(repo_root, "rust"), next_version)

def git_tag(repo_root, next_version):
    tags = utils.subprocess_check_output(["git", "tag"], working_dir=repo_root)
    if f"v{next_version}" in tags:
        print(f"tag v{next_version} is already exists, delete tag v{next_version}")
        utils.subprocess_check_output(["git", "tag", "-d", f"v{next_version}"], working_dir=repo_root)
    print(f"create tag v{next_version}")
    # git rev-parse HEAD
    head_commit = utils.subprocess_check_output(["git", "rev-parse", f"HEAD"], working_dir=repo_root).strip()
    utils.subprocess_check_output(["git", "tag", f"v{next_version}", head_commit], working_dir=repo_root)


def git_push(repo_root):
    print(f"git push origin HEAD --tags")
    output = utils.subprocess_check_output(["git", "push", "origin", "HEAD", "--tags"], working_dir=repo_root)
    print(f"{output}")

def git_commit(repo_root, next_version):
    utils.subprocess_check_output(["git", "add", "."], working_dir=repo_root)
    utils.subprocess_check_output(["git", "commit", "-S", "-m", f"{COMMIT_MESSAGE} v{next_version}"], working_dir=repo_root)

def main():
    parser = argparse.ArgumentParser(description='release tools')
    parser.add_argument('--push', required=False, action="store_true", help='git push')
    parser.add_argument('--version', required=False, help='custom version', default=None)
    args = parser.parse_args()

    # 修复 windows 编码问题
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

    repo_root = utils.REPO_ROOT

    print(f"repo root: {repo_root}")

    changelog_config_path = os.path.join(os.path.join(__file__, "../"), ".versionrc")
    print(f"changelog_config_path: {changelog_config_path}")

    check_convco_install()
    current_version = get_current_version(changelog_config_path)
    next_version = get_next_version(changelog_config_path)
    if args.version is not None:
        next_version = args.version

    print(f"current version: {current_version}")
    print(f"next version: {next_version}")

    # 1. 生成 changelog
    generate_changelog(repo_root, changelog_config_path, "CHANGELOG.md", next_version)

    # 2. 修改版本号
    change_version(repo_root, next_version)

    if args.push:
        # 3. git 提交
        git_commit(repo_root, next_version)
        # 4. 增加 tag
        git_tag(repo_root, next_version)
        # 5. git push --follow-tags
        git_push(repo_root)

if __name__ == '__main__':
    main()
