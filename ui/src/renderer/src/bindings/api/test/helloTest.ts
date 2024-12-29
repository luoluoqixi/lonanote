import { invoke, invokeAsync, regJsFunction } from '@/bindings/core';

export const helloTest = {
  helloCommand: async (data: string[]): Promise<string[]> => {
    return (await invoke('hello_command', data))!;
  },
  helloCommandAsync: async (data: string[]): Promise<string[]> => {
    return (await invokeAsync('hello_command_async', data))!;
  },
  helloRustCallJs: async (): Promise<void> => {
    return (await invokeAsync('hello_rust_call_js'))!;
  },
};

export const initHelloTest = async () => {
  await regJsFunction<string, string>('rust_call_js_fn_key', async (args) => {
    console.log('rust args: ' + args);
    // return '=====js return value=====';
    return undefined;
  });
};
