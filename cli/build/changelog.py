#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs
import os
import sys

import utils

def main():
    # 修复 windows 编码问题
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

    release_title = os.environ.get('RELEASE_TITLE')
    if release_title is None:
        release_title = ""

    repo_root = os.environ.get('GITHUB_WORKSPACE')
    if repo_root is None:
        repo_root = utils.REPO_ROOT

    changelog_path = os.path.join(repo_root, "CHANGELOG.md")

    if os.path.exists(changelog_path):
        with open(changelog_path, "r", encoding="utf8") as f:
            lines = f.readlines()
            current_version = False
            for line in lines:
                line = line.strip()
                if line.startswith(f"### [v") and current_version:
                    break
                if line.startswith(f"## [v") and current_version:
                    break
                if line.startswith(f"# [v") and current_version:
                    break
                if current_version:
                    print(line)
                else:
                    if line.startswith(f"# [v"):
                        if current_version == False:
                            current_version = True
                            print(line)
                    elif line.startswith(f"## [v"):
                        if current_version == False:
                            current_version = True
                            print(line)
                    elif line.startswith(f"### [v"):
                        if current_version == False:
                            current_version = True
                            print(line)
    else:
        print(f"{release_title}")

if __name__ == '__main__':
    main()
