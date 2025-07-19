/* eslint-disable quote-props */
import { commandsCtx, editorViewCtx } from '@milkdown/core';
import { Ctx } from '@milkdown/kit/ctx';
import {
  addBlockTypeCommand,
  blockquoteSchema,
  bulletListSchema,
  clearTextInCurrentBlockCommand,
  codeBlockSchema,
  headingSchema,
  hrSchema,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
  selectTextNearPosCommand,
  setBlockTypeCommand,
  wrapInBlockTypeCommand,
} from '@milkdown/kit/preset/commonmark';
import { createTable } from '@milkdown/kit/preset/gfm';

import { clearContentAndInsertText } from '@/features/block-edit/menu/utils';
import { imageBlockSchema } from '@/features/image/image-block';

const runHeader = (ctx: Ctx, level: number) => {
  const commands = ctx.get(commandsCtx);
  const heading = headingSchema.type(ctx);

  commands.call(clearTextInCurrentBlockCommand.key);
  commands.call(setBlockTypeCommand.key, {
    nodeType: heading,
    attrs: {
      level,
    },
  });
};

export type ActionType =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'quote'
  | 'divider'
  | 'bullet-list'
  | 'ordered-list'
  | 'task-list'
  | 'image-block'
  | 'image-inline'
  | 'code-block'
  | 'table'
  | 'math';

export interface EditorAction {
  name: string;
  value: number;
  run: (ctx: Ctx) => void;
}

export const editorActionList: Record<ActionType, EditorAction> = {
  text: {
    name: 'text',
    value: 0,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const paragraph = paragraphSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(setBlockTypeCommand.key, {
        nodeType: paragraph,
      });
    },
  },
  h1: {
    name: 'h1',
    value: 1,
    run: (ctx) => runHeader(ctx, 1),
  },
  h2: {
    name: 'h2',
    value: 2,
    run: (ctx) => runHeader(ctx, 2),
  },
  h3: {
    name: 'h3',
    value: 3,
    run: (ctx) => runHeader(ctx, 3),
  },
  h4: {
    name: 'h4',
    value: 4,
    run: (ctx) => runHeader(ctx, 4),
  },
  h5: { name: 'h5', value: 5, run: (ctx) => runHeader(ctx, 5) },
  h6: {
    name: 'h6',
    value: 6,
    run: (ctx) => runHeader(ctx, 6),
  },
  quote: {
    name: 'quote',
    value: 7,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const blockquote = blockquoteSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: blockquote,
      });
    },
  },
  divider: {
    name: 'divider',
    value: 8,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const hr = hrSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(addBlockTypeCommand.key, {
        nodeType: hr,
      });
    },
  },
  'bullet-list': {
    name: 'bullet-list',
    value: 9,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const bulletList = bulletListSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: bulletList,
      });
    },
  },
  'ordered-list': {
    name: 'ordered-list',
    value: 10,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const orderedList = orderedListSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: orderedList,
      });
    },
  },
  'task-list': {
    name: 'task-list',
    value: 11,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const listItem = listItemSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(wrapInBlockTypeCommand.key, {
        nodeType: listItem,
        attrs: { checked: false },
      });
    },
  },
  'image-block': {
    name: 'image-block',
    value: 12,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const imageBlock = imageBlockSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(addBlockTypeCommand.key, {
        nodeType: imageBlock,
      });
    },
  },
  'image-inline': {
    name: 'image-inline',
    value: 13,
    run: (ctx) => {
      const view = ctx.get(editorViewCtx);
      const { dispatch, state } = view;

      const command = clearContentAndInsertText('[![]()]()');
      command(state, dispatch);
    },
  },
  'code-block': {
    name: 'code-block',
    value: 14,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const codeBlock = codeBlockSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(setBlockTypeCommand.key, {
        nodeType: codeBlock,
      });
    },
  },
  table: {
    name: 'table',
    value: 15,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const view = ctx.get(editorViewCtx);

      commands.call(clearTextInCurrentBlockCommand.key);

      // record the position before the table is inserted
      const { from } = view.state.selection;
      commands.call(addBlockTypeCommand.key, {
        nodeType: createTable(ctx, 3, 3),
      });

      commands.call(selectTextNearPosCommand.key, {
        pos: from,
      });
    },
  },
  math: {
    name: 'math',
    value: 16,
    run: (ctx) => {
      const commands = ctx.get(commandsCtx);
      const codeBlock = codeBlockSchema.type(ctx);

      commands.call(clearTextInCurrentBlockCommand.key);
      commands.call(addBlockTypeCommand.key, {
        nodeType: codeBlock,
        attrs: { language: 'LaTex' },
      });
    },
  },
};
