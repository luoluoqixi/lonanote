import { editorViewCtx } from '@milkdown/core';
import { Decoration } from '@milkdown/kit/prose/view';
import { upload, uploadConfig } from '@milkdown/plugin-upload';
import { defaultsDeep } from 'lodash-es';

import { defaultUploader } from '@/utils/uploader';

import { defaultConfig } from '../default-config';
import { MarkdownFeature, defaultFeatures } from '../features';
import type { FeaturesConfig } from '../features';
import { loadFeature } from '../features/loader';
import { MarkdownBuilder, MarkdownBuilderConfig } from './builder';
import { FeaturesCtx } from './slice';

/// The editor configuration.
export interface MarkdownEditorConfig extends MarkdownBuilderConfig {
  /// Enable/disable specific features
  features?: Partial<Record<MarkdownFeature, boolean>>;
  /// Configure individual features.
  featureConfigs?: FeaturesConfig;
}

/// The editor class.
export class MarkdownEditor extends MarkdownBuilder {
  /// This is an alias for the `MilkdownFeature` enum.
  static Feature = MarkdownFeature;

  /// @internal
  readonly #parentSetReadonly: (value: boolean) => void;
  /// @internal
  readonly #featuresConfig: FeaturesConfig;

  /// The constructor of the editor.Add commentMore actions
  /// You can pass configs to the editor to configure the editor.
  /// Calling the constructor will not create the editor, you need to call `create` to create the editor.
  constructor({ features, featureConfigs, ...crepeBuilderConfig }: MarkdownEditorConfig) {
    super(crepeBuilderConfig);

    const finalConfigs = defaultsDeep(featureConfigs, defaultConfig);

    const enabledFeatures = Object.entries({
      ...defaultFeatures,
      ...features,
    })
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature as MarkdownFeature);

    this.#parentSetReadonly = this.setReadonly;

    this.#featuresConfig = { ...finalConfigs };

    if (featureConfigs && featureConfigs[MarkdownFeature.Image]) {
      const imgConfig = featureConfigs[MarkdownFeature.Image];
      if (imgConfig.onUpload) {
        const onUpload = imgConfig.onUpload;
        this.editor.use(upload).config((ctx) => {
          ctx.set(uploadConfig.key, {
            uploader: (f, s) => defaultUploader(f, s, onUpload),
            enableHtmlFileUploader: false,
            uploadWidgetFactory: (pos, spec) => {
              const widgetDOM = document.createElement('span');
              widgetDOM.textContent = imgConfig.uploadLoadingText || 'Upload Image...';
              return Decoration.widget(pos, widgetDOM, spec);
            },
          });
        });
      }
    }

    enabledFeatures.forEach((feature) => {
      const config = (this.#featuresConfig as Partial<Record<MarkdownFeature, any>>)[feature];
      this.#featuresConfig[feature] = loadFeature(this.editor, feature, config);
    });
  }

  /// Set the readonly mode of the editor.
  setReadonly = (value: boolean) => {
    this.#parentSetReadonly(value);

    // 同时设置所有 CodeMirror 的 ReadOnly 状态
    const readOnlyEx = this.#featuresConfig[MarkdownFeature.CodeMirror]?.readOnlyCtrl;
    const readOnlyExYaml = this.#featuresConfig[MarkdownFeature.Yaml]?.readOnlyCtrl;
    if (this.editor && (readOnlyEx || readOnlyExYaml)) {
      // 切换所有CodeMirror的ReadOnly
      this.editor.action((ctx) => {
        const flags = ctx?.get(FeaturesCtx);
        const isCodeMirrorEnabled = flags?.includes(MarkdownFeature.CodeMirror);
        if (!isCodeMirrorEnabled) return;
        const view = ctx.get(editorViewCtx);
        this.setCMReadOnly(view.dom, '.milkdown-code-block', readOnlyEx, value);
        this.setCMReadOnly(view.dom, '.milkdown-yaml-block', readOnlyExYaml, value);
      });
    }
    return this;
  };
}
