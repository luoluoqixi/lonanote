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
import { dracula } from '@uiw/codemirror-theme-dracula';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { PurrMDConfig, PurrMDThemeConfig, purrmd, purrmdTheme } from 'purrmd';

export const defaultDetectLanguage = (
  fileName: string,
  markdownConfig: {
    fileName: string;
    config?: PurrMDConfig;
    theme?: PurrMDThemeConfig;
  },
) => {
  const extensions = [];
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'c':
    case 'h':
    case 'cc':
    case 'cpp':
    case 'hpp':
    case 'mm':
    case 'cs':
      extensions.push(cpp());
      break;
    case 'css':
      extensions.push(css());
      break;
    case 'go':
      extensions.push(go());
      break;
    case 'html':
      extensions.push(html());
      break;
    case 'java':
    case 'kt':
    case 'kts':
      extensions.push(java());
      break;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'mjs':
    case 'cjs':
    case 'mts':
    case 'cts':
      extensions.push(javascript());
      break;
    case 'json':
      extensions.push(json());
      break;
    case 'less':
      extensions.push(less());
      break;
    case 'php':
      extensions.push(php());
      break;
    case 'python':
      extensions.push(python());
      break;
    case 'rs':
      extensions.push(rust());
      break;
    case 'sass':
    case 'scss':
      extensions.push(sass());
      break;
    case 'sql':
      extensions.push(sql());
      break;
    case 'vue':
      extensions.push(vue());
      break;
    case 'xml':
    case 'plist':
    case 'storyboard':
      extensions.push(xml());
      break;
    case 'yaml':
    case 'yml':
      extensions.push(yaml());
      break;
    // case 'md':
    // case 'markdown':
    //   return markdown({ codeLanguages: languages });
    case 'txt':
      extensions.push(json());
      extensions.push(yaml());
      break;
    default:
      if (supportMarkdownExts.findIndex((x) => x === ext) >= 0) {
        return [purrmd(markdownConfig.config), purrmdTheme(markdownConfig.theme)];
      }
      return [];
  }
  let resolveTheme = null;
  const themeMode = markdownConfig.theme?.mode;
  if (themeMode !== 'base') {
    resolveTheme =
      themeMode === 'dark' ? vscodeDark : themeMode === 'dracula' ? dracula : vscodeLight;
  }
  if (resolveTheme) extensions.push(resolveTheme);
  return extensions;
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
