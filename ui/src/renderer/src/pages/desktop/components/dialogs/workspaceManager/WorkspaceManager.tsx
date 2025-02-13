import { Box } from '@chakra-ui/react';
import React, { RefObject, useRef, useState } from 'react';
import { IoMdMore } from 'react-icons/io';
import { create } from 'zustand';

import { WorkspaceMetadata, dialog } from '@/bindings/api';
import { Button, Dialog, Editable, Heading, IconButton, Menu, toaster } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';

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
  const contentRef = useRef<HTMLDivElement>(null);
  const state = useWorkspaceManagerState();
  const workspaces = workspaceController.useWorkspace((s) => s.workspaces);
  const [workspacesName, setWorkspacesName] = useState(workspaces.map((v) => v.name));
  const [workspacesPath, setWorkspacesPath] = useState(workspaces.map((v) => v.rootPath));
  const [workspacesEdit, setWorkspacesEdit] = useState(workspaces.map(() => false));
  const [currentMenuIndex, setCurrentMenuIndex] = useState(-1);

  const [openMenu, setOpenMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const updateWorkspacesData = (workspaces: WorkspaceMetadata[]) => {
    setWorkspacesName(workspaces.map((v) => v.name));
    setWorkspacesPath(workspaces.map((v) => v.rootPath));
    setWorkspacesEdit(workspaces.map(() => false));
  };
  const fetchAndUpdateWorkspaceData = async () => {
    const workspaces = await workspaceController.updateWorkspaces();
    console.log(workspaces);
    updateWorkspacesData(workspaces);
  };

  useEffect(async () => {
    if (state.isOpen) {
      fetchAndUpdateWorkspaceData();
    }
  }, [state.isOpen]);

  useEffect(() => updateWorkspacesData(workspaces), [workspaces]);

  const setWorkspaceName = (index: number, val: string) => {
    const newWorkspacesName = [...workspacesName];
    if (newWorkspacesName.length > index) {
      newWorkspacesName[index] = val;
      setWorkspacesName(newWorkspacesName);
    }
  };

  const setWorkspacePath = (index: number, val: string) => {
    const newWorkspacesPath = [...workspacesPath];
    if (newWorkspacesPath.length > index) {
      newWorkspacesPath[index] = val;
      setWorkspacesPath(newWorkspacesPath);
    }
  };

  const setWorkspaceEdit = (index: number, val: boolean) => {
    const newWorkspacesEdit = [...workspacesEdit];
    if (newWorkspacesEdit.length > index) {
      newWorkspacesEdit[index] = val;
      setWorkspacesEdit(newWorkspacesEdit);
    }
  };

  const openMenuClick = (
    index: number,
    e:
      | React.MouseEvent<HTMLDivElement, PointerEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    if (!openMenu) {
      setCurrentMenuIndex(index);
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setOpenMenu(true);
    }
  };

  const setWorkspaceNameCommit = async (index: number, value: string | null) => {
    if (index < 0 || workspaces.length < index) return;
    const workspace = workspaces[index];
    if (await workspaceManagerController.chanWorkspaceName(workspace, value)) {
      await fetchAndUpdateWorkspaceData();
    } else {
      setWorkspaceName(index, workspace.name);
    }
  };

  const setWorkspacePathCommit = async (index: number, value: string | null) => {
    if (index < 0 || workspaces.length < index) return;
    const workspace = workspaces[index];
    if (await workspaceManagerController.changeWorkspaceRootPath(workspace, value)) {
      await fetchAndUpdateWorkspaceData();
    } else {
      setWorkspacePath(index, workspace.rootPath);
    }
  };

  const openFolderClick = () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    if (window.api) {
      const path = workspaces[currentMenuIndex].path;
      console.log('open folder:', path);
      window.api.shell.openPathInFolder(path);
    }
  };
  const renameClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      !(await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能重命名已打开的工作区',
      ))
    ) {
      return;
    }
    setWorkspaceEdit(currentMenuIndex, true);
  };
  const changePathClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      !(await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能改变已打开工作区的路径',
      ))
    ) {
      return;
    }
    const selectPath = await dialog.showOpenFolderDialog('选择文件夹');
    if (selectPath && selectPath !== '') {
      setWorkspacePathCommit(currentMenuIndex, selectPath);
    }
  };

  const removeWorkspaceClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      !(await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能移除已打开的工作区',
      ))
    ) {
      return;
    }
    if (await workspaceManagerController.removeWorkspace(clickWorkspace.path)) {
      await fetchAndUpdateWorkspaceData();
    }
  };

  const openWorkspaceClick = async (index: number) => {
    if (index < 0 || workspaces.length < index) return;
    const clickWorkspace = workspaces[index];
    if (await workspaceManagerController.openWorkspace(clickWorkspace.path)) {
      state.setIsOpen(false);
    }
  };
  const onOpenWorkspace = async () => {
    if (await workspaceManagerController.selectOpenWorkspace()) {
      state.setIsOpen(false);
    }
  };

  return (
    <Dialog.Root
      size="cover"
      placement="center"
      motionPreset="scale"
      closeOnInteractOutside
      open={state.isOpen}
      onOpenChange={(v) => state.setIsOpen(v.open)}
    >
      <Dialog.Content ref={contentRef} positionerProps={{ padding: '90px' }}>
        <Dialog.Header>
          <Dialog.Title>
            <div className={styles.workspaceManagerTitle}>
              <div>工作区</div>
              <Button variant="ghost" size="xs" onClick={onOpenWorkspace}>
                打开新的工作区
              </Button>
            </div>
          </Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body overflow="auto">
          <div className={styles.workspaceManager}>
            {workspaces.length > 0 ? (
              <>
                {workspaces.map((workspace, i) => {
                  const isEdit = workspacesEdit.length > i ? workspacesEdit[i] : false;
                  const name = workspacesName.length > i ? workspacesName[i] : '';
                  const path = workspacesPath.length > i ? workspacesPath[i] : '';
                  return (
                    <Box
                      key={i}
                      _hover={{
                        bg: 'colorPalette.subtle',
                        color: 'fg',
                        _icon: { color: 'colorPalette.fg' },
                      }}
                      className={styles.workspaceRow}
                      onPointerDown={(e) => {
                        if (e.button === 2 && !openMenu) {
                          openMenuClick(i, e);
                        }
                      }}
                      onClick={() => {
                        if (!isEdit) {
                          openWorkspaceClick(i);
                        }
                      }}
                    >
                      <div className={styles.workspaceRowLeft}>
                        <div className={styles.workspaceName}>
                          <Editable
                            edit={isEdit}
                            onEditChange={(e) => setWorkspaceEdit(i, e.edit)}
                            spellCheck={false}
                            showEditBtn={false}
                            previewProps={{ pointerEvents: 'none' }}
                            placeholder="工作区名字"
                            value={name}
                            onValueChange={(e) => {
                              setWorkspaceName(i, e.value);
                            }}
                            onValueCommit={async (details) => {
                              const value = details.value != null ? details.value.trim() : null;
                              setWorkspaceNameCommit(i, value);
                            }}
                          />
                        </div>
                        <div className={styles.workspacePath}>{path}</div>
                      </div>
                      <div className={styles.workspaceRowRight}>
                        <IconButton
                          variant="plain"
                          size="lg"
                          _icon={{
                            color: 'colorPalette.fg',
                          }}
                          _hover={{
                            _icon: {
                              color: 'fg',
                            },
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openMenuClick(i, e);
                          }}
                        >
                          <IoMdMore />
                        </IconButton>
                      </div>
                    </Box>
                  );
                })}
                <Menu.Root
                  open={openMenu}
                  onOpenChange={(e) => setOpenMenu(e.open)}
                  anchorPoint={menuPosition}
                >
                  <Menu.Content portalRef={contentRef as RefObject<HTMLElement>}>
                    <Menu.Item value="open-folder" onClick={openFolderClick}>
                      在资源管理器中显示
                    </Menu.Item>
                    <Menu.Item value="rename" onClick={renameClick}>
                      重命名工作区
                    </Menu.Item>
                    <Menu.Item value="change-path" onClick={changePathClick}>
                      修改路径
                    </Menu.Item>
                    <Menu.Item value="remove" onClick={removeWorkspaceClick}>
                      移除工作区
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Root>
              </>
            ) : (
              <Heading size="sm">没有任何工作区</Heading>
            )}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
