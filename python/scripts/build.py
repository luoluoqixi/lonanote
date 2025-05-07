#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs
import os
import sys

def main():
    # 修复 windows 编码问题
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

    repo_root = os.environ.get('GITHUB_WORKSPACE')
    release_title = os.environ.get('RELEASE_TITLE')
    build_dir = os.environ.get('BUILD_DIR')
    build_name = os.environ.get('BUILD_NAME')
    runner_os = os.environ.get('RUNNER_OS')
    runner_name = os.environ.get('RUNNER_NAME')
    suffix = os.environ.get('SUFFIX')

    current_dir = os.getcwd()

    print(f"仓库根目录: {repo_root}")
    print(f"当前工作目录: {current_dir}")
    print(f"当前 Release 标题: {release_title}")
    print(f"build_dir: {build_dir}")
    print(f"build_name: {build_name}")
    print(f"runner_os: {runner_os}")
    print(f"runner_name: {runner_name}")
    print(f"suffix: {suffix}")

if __name__ == '__main__':
    main()
