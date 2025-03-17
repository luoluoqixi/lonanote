import fs from 'fs';
import path from 'path';

import { walk } from './walk';

const copyFile = async (fromStats: fs.Stats, from: string, to: string) => {
  if (fs.existsSync(to)) {
    const toStats = fs.statSync(to);
    const fromTime = fromStats.mtime.getTime();
    const toTime = toStats.mtime.getTime();
    if (fromTime !== toTime) {
      await fs.promises.copyFile(from, to);
      // console.warn(`拷贝: ${from}: ${fromTime} >> ${to}: ${toTime}`);
    }
  } else {
    const dir = path.dirname(to);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.copyFile(from, to);
  }
};

const copyDir = async (from: string, to: string) => {
  let realFrom = from;
  const fromStats = fs.lstatSync(from);
  if (fromStats.isSymbolicLink()) {
    realFrom = fs.readlinkSync(from);
    realFrom = path.resolve(path.dirname(from), realFrom);
  }
  const successFiles: string[] = [];
  // console.log('realFrom:', realFrom);
  walk(from, async (p, s) => {
    if (s.isFile()) {
      const relativePath = path.relative(realFrom, p);
      const toPath = path.join(to, relativePath);
      await copyFile(s, p, toPath);
      successFiles.push(relativePath.replace(/\\/g, '/'));
    }
  });
  return successFiles;
};

export async function fastcopy(from: string, to: string) {
  if (!fs.existsSync(from)) {
    throw new Error(`from path notfound: ${from}`);
  }
  const s = fs.statSync(from);
  if (s.isFile()) {
    await copyFile(s, from, to);
    return [path.basename(to)];
  }
  return await copyDir(from, to);
}
