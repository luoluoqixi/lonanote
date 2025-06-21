import { createEditor } from './editor';
import './styles/index.scss';
import './theme';
import './utils';

const initEditor = async (contentJson: string) => {
  createEditor(contentJson);
};

window.initEditor = initEditor;
