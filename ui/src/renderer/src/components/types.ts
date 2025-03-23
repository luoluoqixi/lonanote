import { ContextMenu } from '@radix-ui/themes';
import { ReactNode } from 'react';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode | undefined;
  separator?: boolean;
  props?: ContextMenu.ItemProps;
}

export interface DropdownMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode | undefined;
  separator?: boolean;
  props?: ContextMenu.ItemProps;
}
