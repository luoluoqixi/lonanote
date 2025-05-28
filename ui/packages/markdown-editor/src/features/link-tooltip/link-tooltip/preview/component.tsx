import { type Ref, defineComponent, h } from 'vue';

import { Icon } from '../../../../components/icon';
import type { LinkTooltipConfig } from '../slices';

type PreviewLinkProps = {
  config: Ref<LinkTooltipConfig>;
  src: Ref<string>;
  onEdit: Ref<() => void>;
  onRemove: Ref<() => void>;
};

h;

export const PreviewLink = defineComponent<PreviewLinkProps>({
  props: {
    config: {
      type: Object,
      required: true,
    },
    src: {
      type: Object,
      required: true,
    },
    onEdit: {
      type: Object,
      required: true,
    },
    onRemove: {
      type: Object,
      required: true,
    },
  },
  setup({ config, src, onEdit, onRemove }) {
    const onClickEditButton = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit.value();
    };

    const onClickRemoveButton = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove.value();
    };

    const onClickPreview = (e: Event) => {
      e.preventDefault();
      // ==== 修改 ====
      if (config.value?.onCopyLink) {
        config.value?.onCopyLink(src.value || '');
        return;
      }

      const link = src.value;
      if (navigator.clipboard && link) {
        navigator.clipboard.writeText(link).catch((e) => console.error(e));
      }
    };

    // ==== 修改 ====
    const onClickLink = (e: Event) => {
      if (config.value?.onClickLink) {
        config.value.onClickLink(src.value || '');
        e.preventDefault();
      }
    };

    return () => {
      return (
        <div class="link-preview" onPointerdown={onClickPreview}>
          <Icon class="link-icon" icon={config.value.linkIcon()} />
          <a href={src.value} target="_blank" class="link-display" onClick={onClickLink}>
            {src.value}
          </a>
          <Icon
            class="button link-edit-button"
            icon={config.value.editButton()}
            onClick={onClickEditButton}
          />
          <Icon
            class="button link-remove-button"
            icon={config.value.removeButton()}
            onClick={onClickRemoveButton}
          />
        </div>
      );
    };
  },
});
