// sort-imports-ignore

import 'codemirror/lib/codemirror';
import 'hypermd/core';

import 'codemirror/mode/htmlmixed/htmlmixed'; // Markdown 内嵌HTML
import 'codemirror/mode/stex/stex'; // TeX 数学公式
import 'codemirror/mode/yaml/yaml'; // Front Matter
import 'codemirror/mode/javascript/javascript';

import 'hypermd/mode/hypermd';
import 'hypermd/addon/hide-token';
import 'hypermd/addon/cursor-debounce';
import 'hypermd/addon/fold';
import 'hypermd/addon/fold-link';
import 'hypermd/addon/fold-image';
import 'hypermd/addon/fold-math';
import 'hypermd/addon/fold-html';
import 'hypermd/addon/fold-emoji';
import 'hypermd/addon/read-link';
import 'hypermd/addon/click';
import 'hypermd/addon/hover';
import 'hypermd/addon/paste';
import 'hypermd/addon/insert-file';
import 'hypermd/addon/mode-loader';
import 'hypermd/addon/table-align';
import 'hypermd/keymap/hypermd';

import 'hypermd/powerpack/fold-emoji-with-emojione';
// import 'hypermd/powerpack/fold-emoji-with-twemoji';

import 'hypermd/powerpack/insert-file-with-smms';

import 'hypermd/powerpack/hover-with-marked';

import 'hypermd/powerpack/fold-math-with-katex';
// import 'hypermd/powerpack/fold-math-with-mathjax';

import 'hypermd/powerpack/paste-with-turndown';
import 'turndown-plugin-gfm';
