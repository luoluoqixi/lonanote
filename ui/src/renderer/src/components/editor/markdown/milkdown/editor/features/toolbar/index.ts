import type { Ctx } from '@milkdown/kit/ctx';
import { TooltipProvider, tooltipFactory } from '@milkdown/kit/plugin/tooltip';
import type { EditorState, PluginView } from '@milkdown/kit/prose/state';
import { TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { AtomicoThis } from 'atomico/types/dom';
import debounce from 'lodash/debounce';

import { addViewEvent, addViewScrollEvent, defIfNotExists } from '../../utils';
import type { DefineFeature, Icon } from '../types';
import type { ToolbarProps } from './component';
import { ToolbarElement } from './component';

interface ToolbarConfig {
  boldIcon: Icon;
  codeIcon: Icon;
  italicIcon: Icon;
  linkIcon: Icon;
  strikethroughIcon: Icon;
  latexIcon: Icon;
}

export type ToolbarFeatureConfig = Partial<ToolbarConfig>;

const toolbar = tooltipFactory('CREPE_TOOLBAR');

class ToolbarView implements PluginView {
  #tooltipProvider: TooltipProvider;
  #content: AtomicoThis<ToolbarProps>;
  #removeOnScroll: (() => void) | null;
  #removeMousedownListener: (() => void) | null = null;
  #removeMouseupListener: (() => void) | null = null;
  #debouncedUpdate: (view: EditorView, prevState?: EditorState) => void;

  constructor(ctx: Ctx, view: EditorView, config?: ToolbarFeatureConfig) {
    const content = new ToolbarElement();
    this.#content = content;
    this.#content.ctx = ctx;
    this.#content.hide = this.hide;
    this.#content.config = config;
    this.#content.selection = view.state.selection;
    this.#tooltipProvider = new TooltipProvider({
      content: this.#content,
      debounce: 20,
      offset: 10,
      shouldShow(view: EditorView) {
        const { doc, selection } = view.state;
        const { empty, from, to } = selection;

        const isEmptyTextBlock =
          !doc.textBetween(from, to).length && selection instanceof TextSelection;

        const isNotTextBlock = !(selection instanceof TextSelection);

        const activeElement = (view.dom.getRootNode() as ShadowRoot | Document).activeElement;
        const isTooltipChildren = content.contains(activeElement);

        const notHasFocus = !view.hasFocus() && !isTooltipChildren;

        const isReadonly = !view.editable;

        if (notHasFocus || isNotTextBlock || empty || isEmptyTextBlock || isReadonly) return false;

        return true;
      },
    });
    this.#tooltipProvider.onShow = () => {
      this.#content.show = true;
    };
    this.#tooltipProvider.onHide = () => {
      this.#content.show = false;
    };

    this.#debouncedUpdate = debounce((view: EditorView, prevState?: EditorState) => {
      this.#update(view, prevState);
    }, 150);

    this.#update(view);

    this.#removeOnScroll = addViewScrollEvent(view, () => {
      this.#update(view);
    });

    const onMouseUp = () => {
      this.#debouncedUpdate(view);
    };
    const onMouseDown = () => {
      this.hide();
    };
    this.#removeMouseupListener = addViewEvent(window, 'mouseup', onMouseUp);
    this.#removeMousedownListener = addViewEvent(view.dom, 'mousedown', onMouseDown);
  }

  #update = (view: EditorView, prevState?: EditorState) => {
    this.#tooltipProvider.update(view, prevState);
    this.#content.selection = view.state.selection;
  };

  // update = (view: EditorView, prevState?: EditorState) => {
  //   this.#update(view, prevState);
  // };

  destroy = () => {
    if (this.#removeOnScroll) {
      this.#removeOnScroll();
    }
    if (this.#removeMouseupListener) {
      this.#removeMouseupListener();
    }
    if (this.#removeMousedownListener) {
      this.#removeMousedownListener();
    }
    this.#tooltipProvider.destroy();
    this.#content.remove();
  };

  hide = () => {
    this.#tooltipProvider.hide();
  };
}

defIfNotExists('milkdown-toolbar', ToolbarElement);
export const defineToolbar: DefineFeature<ToolbarFeatureConfig> = (editor, config) => {
  editor
    .config((ctx) => {
      ctx.set(toolbar.key, {
        view: (view) => new ToolbarView(ctx, view, config),
      });
    })
    .use(toolbar);

  return config;
};
