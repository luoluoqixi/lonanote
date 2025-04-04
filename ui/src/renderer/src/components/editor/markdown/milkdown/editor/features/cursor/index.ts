import { cursor, dropCursorConfig } from '@milkdown/kit/plugin/cursor';

import type { DefineFeature } from './../types';

interface CursorConfig {
  color: string | false;
  width: number;
}

export type CursorFeatureConfig = Partial<CursorConfig>;

export const defineCursor: DefineFeature<CursorFeatureConfig> = (editor, config) => {
  editor
    .config((ctx) => {
      ctx.update(dropCursorConfig.key, () => ({
        class: 'crepe-drop-cursor',
        width: config?.width ?? 4,
        color: config?.color ?? false,
      }));
    })
    .use(cursor);
  return config;
};
