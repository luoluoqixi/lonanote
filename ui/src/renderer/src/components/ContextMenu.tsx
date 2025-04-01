import { ContextMenu as RadixContextMenu } from '@radix-ui/themes';
import { ReactNode } from 'react';

export interface ContextMenuProps {
  triggerRef?: React.Ref<HTMLSpanElement>;
  rootProps?: RadixContextMenu.RootProps;
  triggerProps?: RadixContextMenu.TriggerProps;
  contentProps?: RadixContextMenu.ContentProps;
  children?: ReactNode;

  items: ContextMenuItem[];
  onOpenChange?(open: boolean): void;
  onMenuClick?: (id: string) => void;
  contentWidth?: number | string;
}

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode | undefined;
  separator?: boolean;
  props?: RadixContextMenu.ItemProps;
}

export const ContextMenu = ({
  triggerRef,
  onOpenChange,
  rootProps,
  triggerProps,
  contentProps,
  children,
  contentWidth,
  items,
  onMenuClick,
}: ContextMenuProps) => {
  return (
    <RadixContextMenu.Root onOpenChange={onOpenChange} {...rootProps}>
      <RadixContextMenu.Trigger ref={triggerRef} {...triggerProps}>
        {children || <span></span>}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Content style={{ width: contentWidth }} {...contentProps}>
        {items.map((m) =>
          m.separator ? (
            <RadixContextMenu.Separator key={m.id} />
          ) : (
            <RadixContextMenu.Item
              key={m.id}
              onClick={() => {
                onMenuClick?.(m.id);
              }}
              {...m.props}
            >
              {m.icon} {m.label}
            </RadixContextMenu.Item>
          ),
        )}
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  );
};
