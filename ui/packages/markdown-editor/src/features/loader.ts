import { Editor } from '@milkdown/core';

import { FeaturesConfig, MarkdownFeature } from '.';
import { defineBlockEdit } from './block-edit';
import { defineCodeMirror } from './codemirror';
import { defineCursor } from './cursor';
import { defineHiglight } from './highlight';
import { defineImage } from './image';
import { defineLatex } from './latex';
import { defineLinkTooltip } from './link-tooltip';
import { defineListItem } from './list-item';
import { defineTable } from './table';
import { defineToolbar } from './toolbar';
import { defineYaml } from './yaml';

export function loadFeature<T extends MarkdownFeature>(
  editor: Editor,
  feature: MarkdownFeature,
  config: FeaturesConfig[T],
): FeaturesConfig[T] {
  switch (feature) {
    case MarkdownFeature.CodeMirror: {
      return defineCodeMirror(editor, config as never);
    }
    case MarkdownFeature.ListItem: {
      return defineListItem(editor, config as never);
    }
    case MarkdownFeature.LinkTooltip: {
      return defineLinkTooltip(editor, config as never);
    }
    case MarkdownFeature.Image: {
      return defineImage(editor, config as never);
    }
    case MarkdownFeature.Cursor: {
      return defineCursor(editor, config as never);
    }
    case MarkdownFeature.BlockEdit: {
      return defineBlockEdit(editor, config as never);
    }
    case MarkdownFeature.Toolbar: {
      return defineToolbar(editor, config as never);
    }
    case MarkdownFeature.Table: {
      return defineTable(editor, config as never);
    }
    case MarkdownFeature.Latex: {
      return defineLatex(editor, config as never);
    }
    case MarkdownFeature.Yaml: {
      return defineYaml(editor, config as never);
    }
    case MarkdownFeature.Highlight: {
      return defineHiglight(editor, config as never);
    }
  }
}
