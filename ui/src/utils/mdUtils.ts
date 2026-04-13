import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

export const mdUtils = {
  mdToHtml: async (mdText: string) => {
    try {
      const file = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .process(mdText);
      const s = file.toString();
      return s;
    } catch (e) {
      console.error(`mdToHtml error: ${e}`);
    }
    return '';
  },
};
