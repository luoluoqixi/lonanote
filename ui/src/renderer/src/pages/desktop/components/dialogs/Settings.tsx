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

import styles from './Settings.module.scss';

export interface SettingsProps {}

export interface SettingsStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useSettings = create<SettingsStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));

export const Settings: React.FC<SettingsProps> = () => {
  const store = useSettings();
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
          <DialogTitle>设置</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <div className={styles.settings}>settings</div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
