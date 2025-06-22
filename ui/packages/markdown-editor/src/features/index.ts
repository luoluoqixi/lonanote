import { BlockEditFeatureConfig } from './block-edit';
import { CodeMirrorFeatureConfig } from './codemirror';
import { CursorFeatureConfig } from './cursor';
import { HiglightFeatureConfig } from './highlight';
import { ImageFeatureConfig } from './image';
import { LatexFeatureConfig } from './latex';
import { LinkTooltipFeatureConfig } from './link-tooltip';
import { ListItemFeatureConfig } from './list-item';
import { TableFeatureConfig } from './table';
import { ToolbarFeatureConfig } from './toolbar';
import { YamlFeatureConfig } from './yaml';

/// The editor feature flags.Add commentMore actions
/// Every feature is enabled by default.
/// Every feature is a string literal type.
export enum MarkdownFeature {
  /// Syntax highlighting and editing for code blocks with language support, theme customization, and preview capabilities.
  CodeMirror = 'code-mirror',
  /// Support for bullet lists, ordered lists, and todo lists with customizable icons and formatting.
  ListItem = 'list-item',
  /// Enhanced link editing and preview with customizable tooltips, edit/remove actions, and copy functionality.
  LinkTooltip = 'link-tooltip',
  /// Enhanced cursor experience with drop cursor and gap cursor for better content placement.
  Cursor = 'cursor',
  /// Image upload and management with resizing, captions, and support for both inline and block images.
  Image = 'image-block',
  /// Drag-and-drop block management and slash commands for quick content insertion and organization.
  BlockEdit = 'block-edit',
  /// Formatting toolbar for selected text with customizable icons and actions.
  Toolbar = 'toolbar',
  /// Full-featured table editing with row/column management, alignment options, and drag-and-drop functionality.
  Table = 'table',
  /// Mathematical formula support with both inline and block math rendering using KaTeX.
  Latex = 'latex',
  /// Yaml
  Yaml = 'yaml',
  /// Highlight
  Highlight = 'highlight',
}

export interface FeaturesConfig {
  [MarkdownFeature.Cursor]?: CursorFeatureConfig;
  [MarkdownFeature.ListItem]?: ListItemFeatureConfig;
  [MarkdownFeature.LinkTooltip]?: LinkTooltipFeatureConfig;
  [MarkdownFeature.Image]?: ImageFeatureConfig;
  [MarkdownFeature.BlockEdit]?: BlockEditFeatureConfig;
  [MarkdownFeature.Toolbar]?: ToolbarFeatureConfig;
  [MarkdownFeature.CodeMirror]?: CodeMirrorFeatureConfig;
  [MarkdownFeature.Table]?: TableFeatureConfig;
  [MarkdownFeature.Latex]?: LatexFeatureConfig;
  [MarkdownFeature.Yaml]?: YamlFeatureConfig;
  [MarkdownFeature.Highlight]?: HiglightFeatureConfig;
}

export const defaultFeatures: Record<MarkdownFeature, boolean> = {
  [MarkdownFeature.Cursor]: true,
  [MarkdownFeature.ListItem]: true,
  [MarkdownFeature.LinkTooltip]: true,
  [MarkdownFeature.Image]: true,
  [MarkdownFeature.BlockEdit]: true,
  [MarkdownFeature.Toolbar]: true,
  [MarkdownFeature.CodeMirror]: true,
  [MarkdownFeature.Table]: true,
  [MarkdownFeature.Latex]: true,
  [MarkdownFeature.Yaml]: true,
  [MarkdownFeature.Highlight]: true,
};

export { ImageMenuKey } from './image/image-menu';
