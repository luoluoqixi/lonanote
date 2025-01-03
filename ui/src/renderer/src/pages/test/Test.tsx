import { useState } from 'react';

import { api } from '@/bindings';
import * as bindings from '@/bindings/core';
import { ColorModeSelect, Link } from '@/components';
import { Button, useColorMode } from '@/components/ui';

export default function Index() {
  const { colorMode, resolvedColorMode } = useColorMode();

  const [logs, setLogs] = useState<string[]>([]);

  let currentLogs = logs;
  const appendLog = (log: string) => {
    console.log(log);
    const newLogs = [...currentLogs, log];
    currentLogs = newLogs;
    setLogs(newLogs);
  };
  const logTime = (label: string, start: number) => {
    appendLog(`${label} ${(performance.now() - start).toFixed(2)}ms`);
  };

  async function helloCommand() {
    const msg: string[] = [];
    for (let i = 0; i < 1000000; i++) {
      msg.push(`test ts${i}`);
    }
    const start = performance.now();
    const data = await api.helloTest.helloCommand(msg);
    logTime(`hello_command: ${data?.length}`, start);

    console.log(data);
  }

  async function helloCommandAsync() {
    const msg: string[] = [];
    for (let i = 0; i < 1000000; i++) {
      msg.push(`test ts${i}`);
    }
    const start = performance.now();
    const data = await api.helloTest.helloCommandAsync(msg);
    logTime(`hello_command_async: ${data?.length}`, start);

    console.log(data);
  }

  async function helloRustCallJs() {
    const start = performance.now();
    await api.helloTest.helloRustCallJs();
    logTime('hello_rust_call_js: ', start);
  }

  async function getCommandKeys() {
    const start = performance.now();
    const keys = await bindings.getCommandKeys();
    const len = await bindings.getCommandLen();
    logTime(`getCommandKeys [${len}]: ${keys.join(',')}`, start);
  }

  async function getCommandAsyncKeys() {
    const start = performance.now();
    const keys = await bindings.getCommandAsyncKeys();
    const len = await bindings.getCommandAsyncLen();
    logTime(`getCommandAsyncKeys [${len}]: ${keys.join(',')}`, start);
  }

  async function getCommandJsKeys() {
    const start = performance.now();
    const keys = await bindings.getCommandJsKeys();
    const len = await bindings.getCommandJsLen();
    logTime(`getCommandJsKeys [${len}]: ${keys.join(',')}`, start);
  }

  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '5px',
  };

  const buttonStyle: React.CSSProperties = {
    width: 200,
  };

  return (
    <div style={{ backgroundColor: 'transparent', margin: '10px' }}>
      <div>
        <div style={wrapStyle}>
          <div>
            <Link to="#">Test Link</Link>
          </div>
          <div style={rowStyle}>
            <Button style={buttonStyle} onClick={helloCommand}>
              helloCommand
            </Button>
            <Button style={buttonStyle} onClick={helloCommandAsync}>
              helloCommandAsync
            </Button>
            <Button style={buttonStyle} onClick={helloRustCallJs}>
              helloRustCallJs
            </Button>
          </div>
          <div style={rowStyle}>
            <Button style={buttonStyle} onClick={getCommandKeys}>
              getCommandKeys
            </Button>
            <Button style={buttonStyle} onClick={getCommandAsyncKeys}>
              getCommandAsyncKeys
            </Button>
            <Button style={buttonStyle} onClick={getCommandJsKeys}>
              getCommandJsKeys
            </Button>
          </div>
          <div style={rowStyle}>
            {/* <Button style={buttonStyle} onClick={() => toast('TestToast')}>Toast</Button> */}
          </div>
          <div style={{ width: 200 }}>
            <ColorModeSelect />
            <div>current: {resolvedColorMode}</div>
            <div>theme: {colorMode}</div>
          </div>
          <div>
            {logs.map((item, index) => (
              <div key={index}>{item}</div>
            ))}
          </div>
          <div id="vditor" className="vditor" />
        </div>
      </div>
    </div>
  );
}
