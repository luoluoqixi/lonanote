import { Ctx } from '@milkdown/ctx';
import { imageSchema, linkSchema } from '@milkdown/preset-commonmark';

export const getLinkMarkType = (ctx: Ctx) => {
  return linkSchema.type(ctx);
};

export const getImageMarkType = (ctx: Ctx) => {
  return imageSchema.type(ctx);
};
