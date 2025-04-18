import type { Editor } from '@milkdown/kit/core';
import type { html } from 'atomico';

export type DefineFeature<Config = unknown> = (
  editor: Editor,
  config?: Config,
) => Config | undefined;

export type Icon = () => ReturnType<typeof html> | string | null;
