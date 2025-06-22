import { cursor as cursorPlugin, dropCursorConfig } from '@milkdown/kit/plugin/cursor';
import { $prose } from '@milkdown/kit/utils';
import { createVirtualCursor } from 'prosemirror-virtual-cursor';

import { MarkdownFeature } from '..';
import { featureConfig } from '../../core/slice';
import type { DefineFeature } from '../types';

interface CursorConfig {
  color: string | false;
  width: number;
  virtual: boolean;
}
export type CursorFeatureConfig = Partial<CursorConfig>;

export const defineCursor: DefineFeature<CursorFeatureConfig> = (editor, config) => {
  editor
    .config(featureConfig(MarkdownFeature.Cursor))
    .config((ctx) => {
      ctx.update(dropCursorConfig.key, () => ({
        class: 'crepe-drop-cursor',
        width: config?.width ?? 4,
        color: config?.color ?? false,
      }));
    })
    .use(cursorPlugin);

  if (!config?.virtual) {
    return config;
  }

  const virtualCursor = createVirtualCursor();
  editor.use($prose(() => virtualCursor));

  return config;
};
