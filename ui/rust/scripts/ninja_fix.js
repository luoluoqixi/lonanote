
const fs = require('fs');
const path = require('path');

function getSDKRoot() {
    return process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
}

function ensureExists(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`${label} not found: ${filePath}`);
    }
}

function getSourceNinjaPath() {
    return path.join(__dirname, 'ninja_1.13.2_fix_long_path.exe');
}

function getInstalledCmakeNinjaPaths(sdkRoot) {
    const cmakeRoot = path.join(sdkRoot, 'cmake');

    if (!fs.existsSync(cmakeRoot)) {
        throw new Error(`CMake directory not found: ${cmakeRoot}`);
    }

    return fs
        .readdirSync(cmakeRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.join(cmakeRoot, dirent.name, 'bin', 'ninja.exe'))
        .filter((ninjaPath) => fs.existsSync(ninjaPath));
}

function sameFileContent(leftPath, rightPath) {
    const left = fs.readFileSync(leftPath);
    const right = fs.readFileSync(rightPath);
    return left.length === right.length && left.equals(right);
}

function replaceNinja(targetPath, sourcePath) {
    if (sameFileContent(targetPath, sourcePath)) {
        console.log(`[skip] same content: ${targetPath}`);
        return;
    }

    const backupPath = `${targetPath}.bak`;

    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(targetPath, backupPath);
        console.log(`[backup] ${targetPath} -> ${backupPath}`);
    } else {
        console.log(`[backup exists] ${backupPath}`);
    }

    fs.copyFileSync(sourcePath, targetPath);
    console.log(`[replace] ${targetPath}`);
}

function main() {
    const sdkRoot = getSDKRoot();
    if (!sdkRoot) {
        throw new Error('ANDROID_SDK_ROOT / ANDROID_HOME is not set');
    }

    const sourceNinjaPath = getSourceNinjaPath();
    ensureExists(sourceNinjaPath, 'Source ninja exe');

    const targetNinjaPaths = getInstalledCmakeNinjaPaths(sdkRoot);
    if (targetNinjaPaths.length === 0) {
        throw new Error(`No CMake ninja.exe found under: ${path.join(sdkRoot, 'cmake')}`);
    }

    console.log(`SDK root: ${sdkRoot}`);
    console.log(`Source ninja: ${sourceNinjaPath}`);

    for (const targetPath of targetNinjaPaths) {
        replaceNinja(targetPath, sourceNinjaPath);
    }
}

if (require.main === module) {
    main();
}
