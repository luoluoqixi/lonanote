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
import { FormattingDisplayMode, purrmd, purrmdTheme } from 'purrmd';

export const defaultDetectLanguage = (
  fileName: string,
  markdownConfig: {
    fileName: string;
    isDark: boolean;
    formattingDisplayMode: FormattingDisplayMode;
  },
) => {
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
    // case 'md':
    // case 'markdown':
    //   return markdown({ codeLanguages: languages });
    case 'txt':
      return [json(), yaml()];
    default:
      if (supportMarkdownExts.findIndex((x) => x === ext) >= 0) {
        return [
          purrmd({
            formattingDisplayMode: markdownConfig.formattingDisplayMode,
          }),
          purrmdTheme({
            mode: markdownConfig.isDark ? 'dark' : 'light',
          }),
        ];
      }
      return [];
  }
};

export const isSupportEditorLanguage = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportEditorExts.findIndex((x) => x === extName) >= 0;
};

/** 支持编辑器的扩展名 */
export const supportEditorExts = [
  'c',
  'h',
  'cc',
  'cpp',
  'hpp',
  'mm',
  'cs',
  'css',
  'go',
  'html',
  'java',
  'kt',
  'kts',
  'js',
  'ts',
  'jsx',
  'tsx',
  'mjs',
  'cjs',
  'mts',
  'cts',
  'json',
  'less',
  'php',
  'python',
  'rs',
  'sass',
  'scss',
  'sql',
  'vue',
  'xml',
  'plist',
  'storyboard',
  'yaml',
  'yml',
  'md',
  'markdown',
  'txt',

  'bat',
  'development',
  'editorconfig',
  'env',
  'gitattributes',
  'gitignore',
  'gradle',
  'ignore',
  'lock',
  'npmrc',
  'podfile',
  'prettierignore',
  'production',
  'properties',
  'readme',
  'taurignore',
  'toml',
] as const;

export const isSupportMarkdown = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportMarkdownExts.findIndex((x) => x === extName) >= 0;
};

/** 支持Markdown编辑器的扩展名 */
export const supportMarkdownExts = ['md', 'markdown'] as const;
