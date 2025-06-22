import { ChildProcess, execSync, spawn, spawnSync } from 'child_process';
import path from 'path';
import { argv } from 'process';
import kill from 'tree-kill';

// const __dirname = import.meta.dirname;

const childs: ChildProcess[] = [];

function cleanExit(code: number) {
  for (const child of childs) {
    if (child && child.pid) {
      kill(child.pid);
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => cleanExit(0));
process.on('SIGTERM', () => cleanExit(0));

const execute = (cmd: string, cwd?: string) => {
  console.log(cmd);
  return execSync(cmd, {
    stdio: 'inherit',
    encoding: 'utf8',
    cwd,
  });
};

const executeAsync = async (
  cmd: string,
  args: string[],
  cwd?: string | null,
  detached?: boolean,
  shell?: boolean,
) => {
  console.log(`${cmd} ${args.join(' ')}`);
  return spawn(cmd, args, {
    cwd: cwd ? path.resolve(__dirname, cwd) : undefined,
    stdio: 'inherit',
    shell: shell == null ? true : shell,
    detached,
  });
};

const dev = async () => {
  console.log('');
  console.log('---------- mobile-editor dev... ----------');
  const p1 = await executeAsync('pnpm', ['-C', 'packages/mobile-editor', 'dev']);
  childs.push(p1);
  console.log('');

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('');
  console.log('---------- flutter run... ----------');
  if (process.platform === 'win32') {
    await executeAsync('flutter', ['run'], '../flutter', true);
  } else {
    executeAsync('script', ['-q', '/dev/null', 'flutter', 'run'], '../flutter', false, false);
  }
  // childs.push(p2);
  console.log('');
};

const build = async (platform?: string | null) => {
  console.log('');
  console.log('---------- mobile-editor build... ----------');
  execute('pnpm -C packages/mobile-editor build');
  console.log('');

  console.log('');
  console.log('---------- flutter build... ----------');
  if (platform == null || platform === '') {
    await executeAsync('flutter', ['run', '--release'], '../flutter');
  } else {
    const buildType = platform === 'android' ? 'apk' : platform === 'ios' ? 'ios' : platform;
    await executeAsync('flutter', ['build', buildType, '--release'], '../flutter');
  }
  console.log('');
};

const main = async () => {
  if (argv.length < 3) {
    console.error('missing command');
    return;
  }
  const command = argv[2];
  if (command === 'dev') {
    await dev();
  } else if (command === 'build') {
    await build();
  } else if (command === 'build-android') {
    await build('android');
  } else if (command === 'build-ios') {
    await build('ios');
  } else {
    console.error(`unknow command: ${command}`);
  }
};

main();
