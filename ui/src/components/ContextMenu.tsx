import { ContextMenu as RadixContextMenu } from '@radix-ui/themes';
import { ReactNode, Ref, forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface ContextMenuProps {
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

  children?: ContextMenuItem[];
}

export interface VirtualEvent {
  clientX?: number | undefined;
  clientY?: number | undefined;
}

export interface ContextMenuRef {
  openMenu: (e: VirtualEvent) => void;
  closeMenu: () => void;
  isOpen: () => boolean;
}

export const ContextMenu = forwardRef((props: ContextMenuProps, ref: Ref<ContextMenuRef>) => {
  const {
    onOpenChange,
    rootProps,
    triggerProps,
    contentProps,
    children,
    contentWidth,
    items,
    onMenuClick,
  } = props;
  const menuRef = useRef<HTMLSpanElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => {
    if (!menuRef.current) return;
    menuRef.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    setMenuOpen(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      openMenu: (e) => {
        if (menuRef.current) {
          menuRef.current.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              clientX: e.clientX,
              clientY: e.clientY,
            }),
          );
        }
      },
      closeMenu: close,
      isOpen: () => {
        return menuOpen;
      },
    }),
    [menuRef],
  );

  const getRenderItem = (m: ContextMenuItem) => {
    const children = m.children;
    const hasChildren = children != null && children.length > 0;
    if (hasChildren) {
      return (
        <RadixContextMenu.Sub key={m.id}>
          <RadixContextMenu.SubTrigger>
            {m.icon} {m.label}
          </RadixContextMenu.SubTrigger>
          <RadixContextMenu.SubContent>
            {children.map((m) => getRenderItem(m))}
          </RadixContextMenu.SubContent>
        </RadixContextMenu.Sub>
      );
    }
    return m.separator ? (
      <RadixContextMenu.Separator key={m.id} />
    ) : (
      <RadixContextMenu.Item
        key={m.id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          close();
          onMenuClick?.(m.id);
        }}
        {...m.props}
      >
        {m.icon} {m.label}
      </RadixContextMenu.Item>
    );
  };

  return (
    <RadixContextMenu.Root onOpenChange={onOpenChange} {...rootProps}>
      <RadixContextMenu.Trigger ref={menuRef} {...triggerProps}>
        {children || <span></span>}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Content style={{ width: contentWidth }} {...contentProps}>
        {items.map((m) => getRenderItem(m))}
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  );
});
