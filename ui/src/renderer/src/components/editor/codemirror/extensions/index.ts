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
    case 'h':
    case 'cc':
    case 'cpp':
    case 'hpp':
    case 'mm':
    case 'cs':
      return cpp();
    case 'css':
      return css();
    case 'go':
      return go();
    case 'html':
      return html();
    case 'java':
    case 'kt':
    case 'kts':
      return java();
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'mjs':
    case 'cjs':
    case 'mts':
    case 'cts':
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
    case 'scss':
      return sass();
    case 'sql':
      return sql();
    case 'vue':
      return vue();
    case 'xml':
    case 'plist':
    case 'storyboard':
      return xml();
    case 'yaml':
    case 'yml':
      return yaml();
    case 'md':
    case 'markdown':
      return markdown();
    case 'txt':
      return [json(), yaml()];
    default:
      return [];
  }
};

const defaultNotShowLineNumList = ['md', 'markdown'] as const;

export const defaultShowLineNum = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return defaultNotShowLineNumList.findIndex((x) => x === ext) < 0;
};
