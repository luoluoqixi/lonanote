import React from 'react';
import { create } from 'zustand';

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui';

import styles from './WorkspaceManager.module.scss';

export interface WorkspaceManagerProps {}

export interface WorkspaceManagerStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useWorkspaceManager = create<WorkspaceManagerStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = () => {
  const store = useWorkspaceManager();
  return (
    <DialogRoot
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={store.isOpen}
      onOpenChange={(v) => store.setIsOpen(v.open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>工作区</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <div className={styles.workspaceManager}>WorkspaceManager</div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
