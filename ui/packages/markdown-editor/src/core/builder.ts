import { Compartment } from '@codemirror/state';
import { EditorView as CMEditorView } from '@codemirror/view';
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
import { Ctx } from '@milkdown/kit/ctx';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { history } from '@milkdown/kit/plugin/history';
import { indent, indentConfig } from '@milkdown/kit/plugin/indent';
import type { ListenerManager } from '@milkdown/kit/plugin/listener';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { commonmark, remarkPreserveEmptyLinePlugin } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { EditorState, Selection, TextSelection } from '@milkdown/kit/prose/state';
import { EditorView } from '@milkdown/kit/prose/view';
import { automd } from '@milkdown/plugin-automd';
import type { Node as ProseNode } from '@milkdown/prose/model';
import { $command, $useKeymap, getMarkdown } from '@milkdown/utils';
import { Slice } from 'prosemirror-model';

import { DefineFeature } from '@/features/types';

import { FeaturesConfig, MarkdownFeature } from '../features';
import { FeaturesCtx, MarkdownEditorCtx, editableCtx } from './slice';

/// The builder configuration.Add commentMore actions
export interface MarkdownBuilderConfig {
  /// The root element for the editor.
  /// Supports both DOM nodes and CSS selectors,
  /// If not provided, the editor will be appended to the body.
  root?: Node | string | null;

  /// The default value for the editor.
  defaultValue?: DefaultValue;

  /// The default readonly for the editor.
  defaultReadOnly?: boolean;
  /// spellCheck
  spellCheck?: boolean;
}

export interface MilkdownEditorEvent {
  onSave: (editor: MarkdownBuilder, state: EditorState) => void;
  onCreate: (editor: MarkdownBuilder) => void;
  onCreated: (editor: MarkdownBuilder) => void;
  onUpdate: (ctx: Ctx, doc: ProseNode, prevDoc: ProseNode | null) => void;
  onMounted: (ctx: Ctx) => void;
  onBeforeMount: (ctx: Ctx) => void;
  onBlur: (ctx: Ctx) => void;
  onFocus: (ctx: Ctx) => void;
  onDestroy: (ctx: Ctx) => void;
  onMouseDown: (view: EditorView, event: MouseEvent) => void;
  onMouseUp: (view: EditorView, event: MouseEvent) => void;
  onMouseEnter: (view: EditorView, event: MouseEvent) => void;
  onMouseMove: (view: EditorView, event: MouseEvent) => void;
  onMouseLeave: (view: EditorView, event: MouseEvent) => void;
  onPointerDown: (view: EditorView, event: PointerEvent) => void;
  onPointerUp: (view: EditorView, event: PointerEvent) => void;
  onPointerEnter: (view: EditorView, event: PointerEvent) => void;
  onPointerMove: (view: EditorView, event: PointerEvent) => void;
  onPointerLeave: (view: EditorView, event: PointerEvent) => void;
  onScroll: (view: EditorView, e: Event) => void;

  onLinkClick: (link: string, view: EditorView, e: Event) => void;
}

type MilkdownEditorEventListeners = {
  [K in keyof MilkdownEditorEvent]?: MilkdownEditorEvent[K][];
};

/// The builder class.Add commentMore actions
/// This class allows users to manually add features to the editor.
export class MarkdownBuilder {
  /// @internal
  readonly #editor: Editor;
  /// @internal
  readonly #rootElement: Node;
  /// @internal
  readonly #events: MilkdownEditorEventListeners;
  /// @internal
  #editable: boolean;

  #dom: HTMLElement | null = null;

  /// The constructor of the crepe builder.
  /// You can pass configs to the builder to configure the editor.
  constructor({
    root,
    defaultValue = '',
    defaultReadOnly = false,
    spellCheck = false,
  }: MarkdownBuilderConfig) {
    this.#events = {};
    this.#editable = !defaultReadOnly;

    this.#rootElement =
      (typeof root === 'string' ? document.querySelector(root) : root) ?? document.body;
    const saveCommand = $command('saveCommand', () => () => {
      return (state) => this.#onSaveCommand(state);
    });
    const saveKeyMap = $useKeymap('saveKeymap', {
      // 这个命令区分大小写, 必须同时绑定
      saveDescriptionLower: {
        shortcuts: 'Mod-s',
        command: (ctx) => {
          const commands = ctx.get(commandsCtx);
          return () => commands.call(saveCommand.key);
        },
      },
      saveDescriptionUpper: {
        shortcuts: 'Mod-S',
        command: (ctx) => {
          const commands = ctx.get(commandsCtx);
          return () => commands.call(saveCommand.key);
        },
      },
    });

    this.#editor = Editor.make()
      .config((ctx) => {
        ctx.inject(MarkdownEditorCtx, this);
        ctx.inject(editableCtx, true);
        ctx.inject(FeaturesCtx, []);
      })
      // .config(configureFeatures(enabledFeatures))
      .config((ctx) => {
        ctx.set(editableCtx, true);
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
          handleDOMEvents: {
            click: (view, e) => {
              const target = e.target;
              if (!target) return;
              const tagName = (target as any).tagName;
              if (tagName != null && tagName.toLowerCase() === 'a') {
                const href = (target as any).getAttribute('href');
                this.#callEvent('onLinkClick', href, view, e);
              }
            },
            mousedown: (view, e) => {
              this.#callEvent('onMouseDown', view, e);
            },
            mouseup: (view, e) => {
              this.#callEvent('onMouseUp', view, e);
            },
            mouseenter: (view, e) => {
              this.#callEvent('onMouseEnter', view, e);
            },
            mousemove: (view, e) => {
              this.#callEvent('onMouseMove', view, e);
            },
            mouseleave: (view, e) => {
              this.#callEvent('onMouseLeave', view, e);
            },
            pointerdown: (view, e) => {
              this.#callEvent('onPointerDown', view, e);
            },
            pointerup: (view, e) => {
              this.#callEvent('onPointerUp', view, e);
            },
            pointerenter: (view, e) => {
              this.#callEvent('onPointerEnter', view, e);
            },
            pointermove: (view, e) => {
              this.#callEvent('onPointerMove', view, e);
            },
            pointerleave: (view, e) => {
              this.#callEvent('onPointerLeave', view, e);
            },
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
      .use(automd)
      .use([saveCommand, saveKeyMap].flat());

    this.#editor.remove(remarkPreserveEmptyLinePlugin);

    // https://github.com/orgs/Milkdown/discussions/1733
    // this.#editor.editor.use(diagram).config((ctx) => {
    //   ctx.set(mermaidConfigCtx.key, {});
    // });

    this.on((listener) => {
      listener.updated((ctx, doc, prev) => this.#onUpdate(ctx, doc, prev));
      listener.mounted((ctx) => this.#onMounted(ctx));
      listener.beforeMount((ctx) => this.#onBeforeMount(ctx));
      listener.destroy((ctx) => this.#onDestroy(ctx));
      listener.blur((ctx) => this.#onBlur(ctx));
      listener.focus((ctx) => this.#onFocus(ctx));
    });
  }

  /// Add a feature to the editor.
  addFeature: {
    <T extends MarkdownFeature>(
      feature: DefineFeature<FeaturesConfig[T]>,
      config?: FeaturesConfig[T],
    ): MarkdownBuilder;
    <C>(feature: DefineFeature<C>, config?: C): MarkdownBuilder;
  } = (feature: DefineFeature, config?: never) => {
    feature(this.#editor, config);
    return this;
  };

  /// Create the editor.
  create = async () => {
    const editor = await this.#editor.create();
    const view = editor.ctx.get(editorViewCtx);

    // https://discuss.prosemirror.net/t/ignore-dynamic-attributes-in-the-html-e-g-aria-attributes-added-by-tippy-js/5442
    // @ts-expect-error radix-ui/themes 的 modal 弹出层会批量修改 aria-hidden, 而当编辑器中存在 CodeMirror 时, 会引起很多 Plugin 重绘
    const original = view.domObserver.registerMutation;
    // @ts-expect-error 强行注册 domObserver 监听忽略掉 aria-hidden 的变化
    view.domObserver.registerMutation = function (this: any, mut: MutationRecord, added: any[]) {
      // console.log('wealthy registerMutation', mut, added);
      if (
        added.length === 0 &&
        mut.type === 'attributes' &&
        (mut.attributeName === 'data-aria-hidden' || mut.attributeName === 'aria-hidden')
      ) {
        return;
      }
      return original.call(this, mut, added);
    };

    this.#dom = view.dom.parentElement;
    this.#dom.addEventListener('scroll', (e) => {
      this.#callEvent('onScroll', view, e);
    });

    this.#onCreate();
    this.#onCreated();
    return editor;
  };

  /// editor dom.
  dom = () => {
    return this.#dom!;
  };

  /// Destroy the editor.
  destroy = async () => {
    for (const k in this.#events) {
      this.#events[k] = undefined;
    }
    return await this.#editor.destroy();
  };

  /// Get the milkdown editor instance.
  get editor(): Editor {
    return this.#editor;
  }

  /// Clear Selection.
  clearSelection = () => {
    this.#editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(0))));
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      view.dom.blur();
      view.dom.focus();
    });
  };

  /// Set the readonly mode of the CodeMirror.
  setCMReadOnly = (
    dom: HTMLElement,
    className: string,
    readOnlyEx: Compartment | undefined,
    readOnly: boolean,
  ) => {
    if (!readOnlyEx) return;
    const cmEditors = dom.querySelectorAll(`${className} .cm-editor`);
    if (cmEditors && cmEditors.length && cmEditors.length > 0) {
      for (const cmEditor of cmEditors) {
        if (!cmEditor) continue;
        const cmView = cmEditor && CMEditorView.findFromDOM(cmEditor as HTMLElement);
        if (cmView) {
          cmView.dispatch({
            effects: readOnlyEx.reconfigure(CMEditorView.editable.of(readOnly ? false : true)),
          });
        }
      }
    }
  };

  /// Set the readonly mode of the editor.
  setReadonly = (value: boolean) => {
    this.setReadonlyRaw(value);
    return this;
  };

  setReadonlyRaw = (value: boolean) => {
    this.#editable = !value;

    this.#editor.action((ctx) => {
      ctx.set(editableCtx, this.#editable);
      if (this.#editor.status === EditorStatus.Created) {
        const view = ctx.get(editorViewCtx);
        view.setProps({
          editable: () => !value,
        });
      }
    });

    // 同时清除选择
    this.clearSelection();
  };

  /// Get the markdown content of the editor.
  getMarkdown = () => {
    return this.#editor.action(getMarkdown());
  };

  /// Set the markdown content of the editor.
  setMarkdown = (content: string, useHistory?: boolean | undefined) => {
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
      throw e;
    }
  };

  /// Register event listeners.
  on = (fn: (api: ListenerManager) => void) => {
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
  };

  /// Register Custom event listeners.
  addListener = <K extends keyof MilkdownEditorEvent>(
    type: K,
    listener: MilkdownEditorEvent[K],
  ): void => {
    if (!this.#events[type]) {
      this.#events[type] = [];
    }
    this.#events[type].push(listener);
  };

  /// Remove Custom event listeners.
  removeListener = <K extends keyof MilkdownEditorEvent>(
    type: K,
    listener: MilkdownEditorEvent[K],
  ): void => {
    if (!this.#events[type]) {
      return;
    }
    const index = this.#events[type].indexOf(listener);
    if (index >= 0) {
      this.#events[type].splice(index, 1);
    }
  };

  /// Clear Custom event listeners.
  clearListener = <K extends keyof MilkdownEditorEvent>(type: K): void => {
    if (!this.#events[type]) {
      return;
    }
    this.#events[type] = undefined;
  };

  focus = () => {
    this.#editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const pos = view.state.doc.content.size;
      const { state } = view;
      const selection = TextSelection.create(state.doc, pos);
      view.focus();
      view.dispatch(state.tr.setSelection(selection));
    });
  };

  focusClick = (e: MouseEvent) => {
    this.#editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) return;
      const selection = TextSelection.create(view.state.doc, pos.pos);
      const tr = view.state.tr.setSelection(selection).scrollIntoView();
      view.dispatch(tr);
      view.focus();
    });
  };

  /// @internal
  /// Call Custom event listeners.
  #callEvent = <K extends keyof MilkdownEditorEvent>(
    type: K,
    ...args: Parameters<MilkdownEditorEvent[K]>
  ) => {
    const listener = this.#events[type];
    if (listener) {
      for (let i = 0; i < listener.length; i++) {
        const cb = listener[i];
        if (cb) {
          try {
            (cb as any)(...args);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  };

  /// @internal
  #onSaveCommand = (state: EditorState) => {
    this.#callEvent('onSave', this, state);
    return true;
  };

  /// @internal
  #onCreate = () => {
    this.#callEvent('onCreate', this);
  };

  /// @internal
  #onCreated = () => {
    this.#callEvent('onCreated', this);
  };

  /// @internal
  #onDestroy = (ctx: Ctx) => {
    this.#callEvent('onDestroy', ctx);
  };

  /// @internal
  #onUpdate = (ctx: Ctx, doc: ProseNode, prevDoc: ProseNode | null) => {
    this.#callEvent('onUpdate', ctx, doc, prevDoc);
  };

  /// @internal
  #onMounted = (ctx: Ctx) => {
    this.#callEvent('onMounted', ctx);
  };

  /// @internal
  #onBeforeMount = (ctx: Ctx) => {
    this.#callEvent('onBeforeMount', ctx);
  };

  /// @internal
  #onBlur = (ctx: Ctx) => {
    this.#callEvent('onBlur', ctx);
  };

  /// @internal
  #onFocus = (ctx: Ctx) => {
    this.#callEvent('onFocus', ctx);
  };
}
