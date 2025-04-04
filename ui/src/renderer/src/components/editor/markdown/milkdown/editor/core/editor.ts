import { EditorView } from '@codemirror/view';
import {
  Editor,
  EditorStatus,
  commandsCtx,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  parserCtx,
  rootCtx,
} from '@milkdown/core';
import type { DefaultValue } from '@milkdown/kit/core';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { history } from '@milkdown/kit/plugin/history';
import { indent, indentConfig } from '@milkdown/kit/plugin/indent';
import type { ListenerManager } from '@milkdown/kit/plugin/listener';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { EditorState } from '@milkdown/kit/prose/state';
import { Decoration } from '@milkdown/kit/prose/view';
import { Uploader, upload, uploadConfig } from '@milkdown/plugin-upload';
import type { Node as MilkdownNode } from '@milkdown/prose/model';
import { $command, $useKeymap, getMarkdown } from '@milkdown/utils';
import { Slice } from 'prosemirror-model';

import { MilkdownFeature, defaultFeatures, loadFeature } from '../features';
import type { FeaturesConfig } from '../features';
import { FeaturesCtx, configureFeatures, milkdownEditorCtx } from './slice';

export interface MilkdownEditorConfig {
  root?: Node | string | null;
  defaultValue?: DefaultValue;
  defaultReadOnly?: boolean;
  spellCheck?: boolean;
  features?: Partial<Record<MilkdownFeature, boolean>>;
  featureConfigs?: FeaturesConfig;
}

export interface MilkdownEditorEvent {
  onSave: (state: EditorState) => boolean;
}

type MilkdownEditorEventListeners = {
  [K in keyof MilkdownEditorEvent]?: MilkdownEditorEvent[K][];
};

const defaultUploader: Uploader = async (files, schema) => {
  const imgs: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files.item(i);
    if (!file) continue;
    if (!file.type.includes('image')) continue;
    imgs.push(file);
  }
  const { image } = schema.nodes;
  if (!image) throw new Error('Missing node in schema, milkdown cannot find "image" in schema.');
  // TODO 上传图片
  const data = await Promise.all(
    imgs.map((img) => ({
      src: '',
      alt: img.name,
    })),
  );
  return data.map(({ alt, src }) => image.createAndFill({ src, alt }) as MilkdownNode);
};

export class MilkdownEditor {
  readonly #editor: Editor;
  readonly #rootElement: Node;
  readonly #featuresConfig: FeaturesConfig;
  readonly #events: MilkdownEditorEventListeners;
  #editable: boolean;

  constructor({
    root,
    defaultValue = '',
    defaultReadOnly = false,
    spellCheck = false,
    features,
    featureConfigs,
  }: MilkdownEditorConfig) {
    const enabledFeatures = Object.entries({
      ...defaultFeatures,
      ...features,
    })
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature as MilkdownFeature);

    this.#events = {};
    this.#featuresConfig = { ...featureConfigs };
    this.#editable = !defaultReadOnly;

    this.#rootElement =
      (typeof root === 'string' ? document.querySelector(root) : root) ?? document.body;

    const saveCommand = $command('saveCommand', () => () => {
      return (state) => this.#onSaveCommand(state);
    });
    const saveKeyMap = $useKeymap('saveKeymap', {
      saveDescription: {
        shortcuts: 'Mod-s',
        command: (ctx) => {
          const commands = ctx.get(commandsCtx);
          return () => commands.call(saveCommand.key);
        },
      },
    });

    this.#editor = Editor.make()
      .config((ctx) => {
        ctx.inject(milkdownEditorCtx, this);
      })
      .config(configureFeatures(enabledFeatures))
      .config((ctx) => {
        ctx.set(rootCtx, this.#rootElement);
        ctx.set(defaultValueCtx, defaultValue);
        ctx.set(editorViewOptionsCtx, {
          editable: () => this.#editable,
        });
        ctx.update(indentConfig.key, (value) => ({
          ...value,
          size: 4,
        }));
      })
      .config((ctx) => {
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          attributes: {
            ...prev.attributes,
            spellcheck: spellCheck ? 'true' : 'false',
          },
        }));
      })
      .use(commonmark)
      .use(listener)
      .use(history)
      .use(indent)
      .use(trailing)
      .use(clipboard)
      .use(gfm)
      .use([saveCommand, saveKeyMap].flat());

    this.#editor.use(upload).config((ctx) => {
      ctx.set(uploadConfig.key, {
        uploader: defaultUploader,
        enableHtmlFileUploader: false,
        uploadWidgetFactory: (pos, spec) => {
          const widgetDOM = document.createElement('span');
          widgetDOM.textContent = '上传文件...';
          return Decoration.widget(pos, widgetDOM, spec);
        },
      });
    });

    // https://github.com/orgs/Milkdown/discussions/1733
    // this.#editor.editor.use(diagram).config((ctx) => {
    //   ctx.set(mermaidConfigCtx.key, {});
    // });

    enabledFeatures.forEach((feature) => {
      const config = (this.#featuresConfig as Partial<Record<MilkdownFeature, any>>)[feature];
      this.#featuresConfig[feature] = loadFeature(this.#editor, feature, config);
    });
  }

  async create() {
    return await this.#editor.create();
  }

  async destroy() {
    for (const k in this.#events) {
      this.#events[k] = undefined;
    }
    return await this.#editor.destroy();
  }

  get editor(): Editor {
    return this.#editor;
  }

  setReadonly(value: boolean) {
    this.#editable = !value;
    const readOnlyEx = this.#featuresConfig[MilkdownFeature.CodeMirror]?.readOnlyCtrl;
    if (this.#editor && readOnlyEx) {
      // 切换所有CodeMirror的ReadOnly
      this.#editor.action((ctx) => {
        const flags = ctx?.get(FeaturesCtx);
        const isCodeMirrorEnabled = flags?.includes(MilkdownFeature.CodeMirror);
        if (!isCodeMirrorEnabled) return;

        const view = ctx.get(editorViewCtx);
        const cmEditors = view.dom.querySelectorAll('.cm-editor');
        if (cmEditors && cmEditors.length && cmEditors.length > 0) {
          for (const cmEditor of cmEditors) {
            if (!cmEditor) continue;
            const cmView = cmEditor && EditorView.findFromDOM(cmEditor as HTMLElement);
            if (cmView) {
              cmView.dispatch({
                effects: readOnlyEx.reconfigure(EditorView.editable.of(value ? false : true)),
              });
            }
          }
        }
      });
    }
    return this;
  }

  getMarkdown() {
    return this.#editor.action(getMarkdown());
  }

  setMarkdown(content: string, useHistory?: boolean | undefined) {
    try {
      // editor.editor.action((ctx) => {
      //   const view = ctx.get(editorViewCtx);
      //   view.state.tr.setMeta('addToHistory', false);
      //   replaceAll(content)(ctx);
      // });
      this.#editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const parser = ctx.get(parserCtx);
        const doc = parser(content);
        if (!doc) return;
        const state = view.state;
        view.dispatch(
          state.tr
            .setMeta('addToHistory', useHistory ? true : false)
            .replace(0, state.doc.content.size, new Slice(doc.content, 0, 0)),
        );
      });
    } catch (e) {
      console.error('setValue Error', e);
    }
  }

  on(fn: (api: ListenerManager) => void) {
    if (this.#editor.status !== EditorStatus.Created) {
      this.#editor.config((ctx) => {
        const listener = ctx.get(listenerCtx);
        fn(listener);
      });
      return this;
    }
    this.#editor.action((ctx) => {
      const listener = ctx.get(listenerCtx);
      fn(listener);
    });
    return this;
  }

  addListener<K extends keyof MilkdownEditorEvent>(
    type: K,
    listener: MilkdownEditorEvent[K],
  ): void {
    if (!this.#events[type]) {
      this.#events[type] = [];
    }
    this.#events[type].push(listener);
  }

  removeListener<K extends keyof MilkdownEditorEvent>(
    type: K,
    listener: MilkdownEditorEvent[K],
  ): void {
    if (!this.#events[type]) {
      return;
    }
    const index = this.#events[type].indexOf(listener);
    if (index >= 0) {
      this.#events[type].splice(index, 1);
    }
  }

  clearListener<K extends keyof MilkdownEditorEvent>(type: K): void {
    if (!this.#events[type]) {
      return;
    }
    this.#events[type] = undefined;
  }

  #onSaveCommand(state: EditorState) {
    const onSaveListener = this.#events['onSave'];
    if (onSaveListener) {
      for (let i = 0; i < onSaveListener.length; i++) {
        const onSave = onSaveListener[i];
        if (onSave(state)) {
          return true;
        }
      }
    }
    return true;
  }
}
