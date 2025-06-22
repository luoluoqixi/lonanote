import { tableBlock, tableBlockConfig } from '@milkdown/kit/component/table-block';

import { MarkdownFeature } from '..';
import { featureConfig } from '../../core/slice';
import {
  alignCenterIcon,
  alignLeftIcon,
  alignRightIcon,
  dragHandleIcon,
  plusIcon,
  removeIcon,
} from '../../icons';
import type { DefineFeature } from '../types';

interface TableConfig {
  addRowIcon: string;
  addColIcon: string;
  deleteRowIcon: string;
  deleteColIcon: string;
  alignLeftIcon: string;
  alignCenterIcon: string;
  alignRightIcon: string;
  colDragHandleIcon: string;
  rowDragHandleIcon: string;
}

export type TableFeatureConfig = Partial<TableConfig>;

export const defineTable: DefineFeature<TableFeatureConfig> = (editor, config) => {
  editor
    .config(featureConfig(MarkdownFeature.Table))
    .config((ctx) => {
      ctx.update(tableBlockConfig.key, (defaultConfig) => ({
        ...defaultConfig,
        renderButton: (renderType) => {
          switch (renderType) {
            case 'add_row':
              return config?.addRowIcon ?? plusIcon;
            case 'add_col':
              return config?.addColIcon ?? plusIcon;
            case 'delete_row':
              return config?.deleteRowIcon ?? removeIcon;
            case 'delete_col':
              return config?.deleteColIcon ?? removeIcon;
            case 'align_col_left':
              return config?.alignLeftIcon ?? alignLeftIcon;
            case 'align_col_center':
              return config?.alignCenterIcon ?? alignCenterIcon;
            case 'align_col_right':
              return config?.alignRightIcon ?? alignRightIcon;
            case 'col_drag_handle':
              return config?.colDragHandleIcon ?? dragHandleIcon;
            case 'row_drag_handle':
              return config?.rowDragHandleIcon ?? dragHandleIcon;
          }
        },
      }));
    })
    .use(tableBlock);

  return config;
};
