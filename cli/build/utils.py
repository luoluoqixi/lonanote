#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import stat
import subprocess

def make_writable_path(path):
    try:
        if not os.access(path, os.W_OK):
            os.chmod(path, stat.S_IWRITE | stat.S_IWGRP | stat.S_IWOTH)
        if os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                for item in dirs + files:
                    item_path = os.path.join(root, item)
                    if not os.access(path, os.W_OK):
                        os.chmod(item_path, stat.S_IWRITE | stat.S_IWGRP | stat.S_IWOTH)
    except Exception as e:
        raise RuntimeError(f"make_writable_path error: {path}: {e}")

def subprocess_check_output(command, input=None, throw_error=True, working_dir=None):
    cwd = os.getcwd()
    try:
        if working_dir is not None:
            os.chdir(working_dir)
        output = subprocess.check_output(command, input=input, universal_newlines=True, encoding='utf8')
        if working_dir is not None:
            os.chdir(cwd)
        return output
    except Exception as err:
        print(f"run command {command} error: {err}")
        if working_dir is not None:
            os.chdir(cwd)
        if throw_error:
            raise RuntimeError(err)
        else:
            return None

def subprocess_run(command, input=None, throw_error=True, working_dir=None):
    cwd = os.getcwd()
    try:
        if working_dir is not None:
            os.chdir(working_dir)
        cp = subprocess.run(command, input=input, universal_newlines=True, encoding='utf8')
        if working_dir is not None:
            os.chdir(cwd)
        if cp.returncode != 0:
            err = cp.stderr
            if err is None:
                err = cp.returncode
            print(f"run command {command} error: {err}")
            if throw_error:
                raise RuntimeError(err)
            else:
                return cp
        return cp
    except Exception as err:
        if working_dir is not None:
            os.chdir(cwd)
        print(err)
        if throw_error:
            raise RuntimeError(err)
        else:
            return None


REPO_ROOT = os.path.normpath(os.path.join(__file__, "../../../"))
