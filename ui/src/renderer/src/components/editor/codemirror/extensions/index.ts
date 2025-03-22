import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { less } from '@codemirror/lang-less';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { sass } from '@codemirror/lang-sass';
import { sql } from '@codemirror/lang-sql';
import { vue } from '@codemirror/lang-vue';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';

import { markdown } from './markdown';
import './markdown.scss';

export * from './markdown';

export const detectLanguage = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'c':
      return cpp();
    case 'h':
      return cpp();
    case 'cc':
      return cpp();
    case 'cpp':
      return cpp();
    case 'hpp':
      return cpp();
    case 'cs':
      return cpp();
    case 'css':
      return css();
    case 'go':
      return go();
    case 'html':
      return html();
    case 'java':
      return java();
    case 'js':
      return javascript();
    case 'ts':
      return javascript();
    case 'jsx':
      return javascript();
    case 'tsx':
      return javascript();
    case 'json':
      return json();
    case 'less':
      return less();
    case 'php':
      return php();
    case 'python':
      return python();
    case 'rs':
      return rust();
    case 'sass':
      return sass();
    case 'scss':
      return sass();
    case 'sql':
      return sql();
    case 'vue':
      return vue();
    case 'xml':
      return xml();
    case 'yaml':
      return yaml();
    case 'yml':
      return yaml();
    case 'md':
      return markdown();
    case 'markdown':
      return markdown();
    case 'txt':
      return [json(), yaml()];
    default:
      return [];
  }
};
