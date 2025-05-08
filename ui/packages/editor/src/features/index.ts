import { Editor } from '@milkdown/core';

import { BlockEditFeatureConfig, defineBlockEdit } from './block-edit';
import { CodeMirrorFeatureConfig, defineCodeMirror } from './codemirror';
import { CursorFeatureConfig, defineCursor } from './cursor';
import { HiglightFeatureConfig, defineHiglight } from './highlight';
import { ImageFeatureConfig, defineImage } from './image';
import { LatexFeatureConfig, defineLatex } from './latex';
import { LinkTooltipFeatureConfig, defineLinkTooltip } from './link-tooltip';
import { ListItemFeatureConfig, defineListItem } from './list-item';
import { TableFeatureConfig, defineTable } from './table';
import { ToolbarFeatureConfig, defineToolbar } from './toolbar';
import { YamlFeatureConfig, defineYaml } from './yaml';

export enum MilkdownFeature {
  CodeMirror = 'code-mirror',
  ListItem = 'list-item',
  LinkTooltip = 'link-tooltip',
  Cursor = 'cursor',
  Image = 'image-block',
  BlockEdit = 'block-edit',
  Toolbar = 'toolbar',
  Table = 'table',
  Latex = 'latex',
  Yaml = 'yaml',
  Highlight = 'highlight',
}

export interface FeaturesConfig {
  [MilkdownFeature.Cursor]?: CursorFeatureConfig;
  [MilkdownFeature.ListItem]?: ListItemFeatureConfig;
  [MilkdownFeature.LinkTooltip]?: LinkTooltipFeatureConfig;
  [MilkdownFeature.Image]?: ImageFeatureConfig;
  [MilkdownFeature.BlockEdit]?: BlockEditFeatureConfig;
  [MilkdownFeature.Toolbar]?: ToolbarFeatureConfig;
  [MilkdownFeature.CodeMirror]?: CodeMirrorFeatureConfig;
  [MilkdownFeature.Table]?: TableFeatureConfig;
  [MilkdownFeature.Latex]?: LatexFeatureConfig;
  [MilkdownFeature.Yaml]?: YamlFeatureConfig;
  [MilkdownFeature.Highlight]?: HiglightFeatureConfig;
}

export const defaultFeatures: Record<MilkdownFeature, boolean> = {
  [MilkdownFeature.Cursor]: true,
  [MilkdownFeature.ListItem]: true,
  [MilkdownFeature.LinkTooltip]: true,
  [MilkdownFeature.Image]: true,
  [MilkdownFeature.BlockEdit]: true,
  [MilkdownFeature.Toolbar]: true,
  [MilkdownFeature.CodeMirror]: true,
  [MilkdownFeature.Table]: true,
  [MilkdownFeature.Latex]: true,
  [MilkdownFeature.Yaml]: true,
  [MilkdownFeature.Highlight]: true,
};

export function loadFeature(editor: Editor, feature: MilkdownFeature, config: any): any {
  switch (feature) {
    case MilkdownFeature.CodeMirror: {
      return defineCodeMirror(editor, config);
    }
    case MilkdownFeature.ListItem: {
      return defineListItem(editor, config);
    }
    case MilkdownFeature.LinkTooltip: {
      return defineLinkTooltip(editor, config);
    }
    case MilkdownFeature.Image: {
      return defineImage(editor, config);
    }
    case MilkdownFeature.Cursor: {
      return defineCursor(editor, config);
    }
    case MilkdownFeature.BlockEdit: {
      return defineBlockEdit(editor, config);
    }
    case MilkdownFeature.Toolbar: {
      return defineToolbar(editor, config);
    }
    case MilkdownFeature.Table: {
      return defineTable(editor, config);
    }
    case MilkdownFeature.Latex: {
      return defineLatex(editor, config);
    }
    case MilkdownFeature.Yaml: {
      return defineYaml(editor, config);
    }
    case MilkdownFeature.Highlight: {
      return defineHiglight(editor, config);
    }
  }
}

export { ImageMenuKey } from './image/image-menu';
