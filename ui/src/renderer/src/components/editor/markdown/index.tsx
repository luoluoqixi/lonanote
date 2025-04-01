import { Ref, forwardRef, useMemo } from 'react';

import { EditorBackEnd } from '@/models/editor';

import { MarkdownEditor as HyperMDEditor } from './hypermd';
import { MarkdownEditor as MilkdownMDEditor } from './milkdown';
import { MarkdownEditorProps as CommonMarkdownEditorProps, MarkdownEditorRef } from './types';
import { MarkdownEditor as VditorMDEditor } from './vditor';

export * from './detectLanguage';
export * from './types';

export interface MarkdownEditorProps extends CommonMarkdownEditorProps {
  editorBackEnd: EditorBackEnd;
}

export const MarkdownEditor = forwardRef(
  ({ editorBackEnd, ...rest }: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
    const { isHyperMD, isMilkdown, isVditor } = useMemo(
      () => ({
        isVditor: editorBackEnd === 'vditor',
        isHyperMD: editorBackEnd === 'hypermd',
        isMilkdown: editorBackEnd === 'milkdown',
      }),
      [editorBackEnd],
    );
    return (
      <>
        {isVditor && <VditorMDEditor ref={ref} {...rest} />}
        {isHyperMD && <HyperMDEditor ref={ref} {...rest} />}
        {isMilkdown && <MilkdownMDEditor ref={ref} {...rest} />}
      </>
    );
  },
);
