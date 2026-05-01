import type { NativeModule, Signal } from 'craby-modules';
import { NativeModuleRegistry } from 'craby-modules';

export interface CallbackRequest {
  id: string;
  key: string;
  args: string | null;
}

interface Spec extends NativeModule {
  onCallbackRequest: Signal<CallbackRequest>;
  init(): string | null;
  invoke(command: string, args: string | null): string | null;
  getCommandKeys(): string[];
  getCommandLength(): number;
  invokeAsync(command: string, args: string | null): Promise<string | null>;
  getCommandAsyncKeys(): string[];
  getCommandAsyncLength(): number;
  regCallbackFunction(key: string): Promise<void>;
  unregCallbackFunction(key: string): Promise<void>;
  clearCallbackFunction(): Promise<void>;
  getCommandCallbackKeys(): string[];
  getCommandCallbackLength(): number;
  resolveCallback(id: string, result: string | null): void;
  rejectCallback(id: string, error: string): void;
}

export default NativeModuleRegistry.getEnforcing<Spec>('LonanoteRustModule');
