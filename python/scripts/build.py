#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import io
import sys

# 修复 windows 编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

repo_root = os.environ.get('GITHUB_WORKSPACE')
build_name = os.environ.get('BUILD_NAME')
build_dir = os.environ.get('BUILD_DIR')

runner_os = os.environ.get('RUNNER_OS')
runner_name = os.environ.get('RUNNER_NAME')

suffix = os.environ.get('SUFFIX')
release_title = os.environ.get('RELEASE_TITLE')

output_name = f"{build_name}-{release_title}-{suffix}"

print(f"repo_root: {repo_root}")
print(f"build_name: {build_name}")
print(f"build_dir: {build_dir}")

print(f"runner_os: {runner_os}")
print(f"runner_name: {runner_name}")

print(f"suffix: {suffix}")
print(f"release_title: {release_title}")

print(f"output_name: {output_name}")

# build

