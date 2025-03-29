import { Ref, forwardRef } from 'react';

// import { MarkdownEditor as HyperMDEditor } from './hypermd';
import { MarkdownEditorProps, MarkdownEditorRef } from './types';
import { MarkdownEditor as VditorMDEditor } from './vditor';

export * from './detectLanguage';
export * from './types';

export const MarkdownEditor = forwardRef(
  (props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
    return (
      <>
        <VditorMDEditor ref={ref} {...props} />
        {/* <HyperMDEditor ref={ref} {...props} /> */}
      </>
    );
  },
);
