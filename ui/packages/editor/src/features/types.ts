import type { Editor } from '@milkdown/kit/core';

export type DefineFeature<Config = unknown> = (
  editor: Editor,
  config?: Config,
) => Config | undefined;

export type Icon = () => string;
