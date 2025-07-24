import { execSync } from 'child_process';
import path from 'path';

import { CopyFileItem, executeCopyFiles } from './plugins/perprocess/copyFile';

// const __dirname = import.meta.dirname;

const execute = (cmd: string) => {
  console.log(cmd);
  return execSync(cmd, {
    stdio: 'inherit',
    encoding: 'utf8',
  });
};

const npmInstall = (npm: string, projectPath: string) => {
  const cmd = `${npm} -C ${projectPath} install`;
  execute(cmd);
};

const copyFileContext = {
  warn: console.warn,
};

const copyFiles: CopyFileItem[] = [];

const main = async () => {
  console.log('');
  console.log('---------- install rust/node ... ----------');
  npmInstall('pnpm', path.resolve(__dirname, '../../rust/node'));
  console.log('---------- install finish ---------');

  console.log('');
  console.log('---------- copy files ... ----------');
  await executeCopyFiles(copyFileContext, copyFiles);
  console.log('---------- copy files finish ----------');

  console.log('');
};

main();
