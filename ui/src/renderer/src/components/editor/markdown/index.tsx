import { Ref, forwardRef } from 'react';

import { MarkdownEditor as HyperMDEditor } from './hypermd';
import { MarkdownEditorProps, MarkdownEditorRef } from './types';

export * from './detectLanguage';
export * from './types';

export const MarkdownEditor = forwardRef(
  (props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
    return (
      <>
        <HyperMDEditor ref={ref} {...props} />
      </>
    );
  },
);
