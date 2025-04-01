import { ContextMenu, DropdownMenu } from '@radix-ui/themes';
import { ReactNode } from 'react';
import { HiOutlineCheck } from 'react-icons/hi';

export interface DropdownProps {
  rootProps?: DropdownMenu.RootProps;
  triggerProps?: DropdownMenu.TriggerProps;
  contentProps?: DropdownMenu.ContentProps;
  children?: ReactNode;
  items: DropdownMenuItem[];
  onMenuClick?: (id: string) => void;
  selectId?: string | null;
  contentWidth?: number | string;
}

export interface DropdownMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode | undefined;
  separator?: boolean;
  props?: ContextMenu.ItemProps;
}

export const Dropdown = ({
  rootProps,
  triggerProps,
  contentProps,
  children,
  selectId,
  contentWidth,
  items,
  onMenuClick,
}: DropdownProps) => {
  return (
    <DropdownMenu.Root {...rootProps}>
      <DropdownMenu.Trigger {...triggerProps}>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Content style={{ width: contentWidth }} {...contentProps}>
        {items.map((m) =>
          m.separator ? (
            <DropdownMenu.Separator key={m.id} />
          ) : (
            <DropdownMenu.Item key={m.id} onClick={() => onMenuClick?.(m.id)} {...m.props}>
              {m.icon} {m.label}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 'auto',
                }}
              >
                {selectId && selectId === m.id && <HiOutlineCheck size="18px" />}
              </div>
            </DropdownMenu.Item>
          ),
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
