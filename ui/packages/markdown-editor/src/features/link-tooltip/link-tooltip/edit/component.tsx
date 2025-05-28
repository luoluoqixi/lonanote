import { type Ref, defineComponent, h, ref, watch } from 'vue';

import { Icon } from '../../../../components';
import type { LinkTooltipConfig } from '../slices';

h;

type EditLinkProps = {
  config: Ref<LinkTooltipConfig>;
  src: Ref<string>;
  onConfirm: (href: string) => void;
  onCancel: () => void;
};

export const EditLink = defineComponent<EditLinkProps>({
  props: {
    config: {
      type: Object,
      required: true,
    },
    src: {
      type: Object,
      required: true,
    },
    onConfirm: {
      type: Function,
      required: true,
    },
    onCancel: {
      type: Function,
      required: true,
    },
  },
  setup({ config, src, onConfirm, onCancel }) {
    const link = ref(src);

    watch(src, (value) => {
      link.value = value;
    });

    const onConfirmEdit = () => {
      onConfirm(link.value);
    };

    const onKeydown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirmEdit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    return () => {
      return (
        <div class="link-edit">
          <input
            class="input-area"
            placeholder={config.value.inputPlaceholder}
            onKeydown={onKeydown}
            onInput={(e: Event) => {
              link.value = (e.target as HTMLInputElement).value;
            }}
            value={link.value}
            // ==== 修改 ====
            spellcheck={false}
          />
          {link.value ? (
            <Icon
              class="button confirm"
              icon={config.value.confirmButton()}
              onClick={onConfirmEdit}
            />
          ) : null}
        </div>
      );
    };
  },
});
