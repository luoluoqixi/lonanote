import React from 'react';
import { create } from 'zustand';

import { Dialog } from '@/components/ui';

import styles from './WorkspaceManager.module.scss';

export interface WorkspaceManagerProps {}

export interface WorkspaceManagerStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useWorkspaceManagerState = create<WorkspaceManagerStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = () => {
  const state = useWorkspaceManagerState();
  return (
    <Dialog.Root
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={state.isOpen}
      onOpenChange={(v) => state.setIsOpen(v.open)}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>工作区</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <div className={styles.workspaceManager}>WorkspaceManager</div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
