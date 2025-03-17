import fs from 'fs';
import path from 'path';

function _walk(dir: string, recursive: boolean, callback: (path: string, stats: fs.Stats) => void) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      callback(filepath, stats);
      if (recursive) {
        _walk(filepath, recursive, callback);
      }
    } else if (stats.isFile()) {
      callback(filepath, stats);
    }
  });
}

export function walk(dir: string, callback: (path: string, stats: fs.Stats) => void) {
  _walk(dir, true, callback);
}
export function walkOne(dir: string, callback: (path: string, stats: fs.Stats) => void) {
  _walk(dir, false, callback);
}
