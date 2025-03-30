import { Button, DropdownMenu, Text, Tooltip } from '@radix-ui/themes';
import path from 'path-browserify-esm';
import { useMemo } from 'react';
import { AiOutlineRead } from 'react-icons/ai';
import { IoMdArrowBack, IoMdArrowForward, IoMdMore } from 'react-icons/io';
import { MdOutlineDriveFileRenameOutline, MdOutlineFileOpen } from 'react-icons/md';
import { PiSquareSplitHorizontal } from 'react-icons/pi';
import { TbAlignBoxLeftBottom } from 'react-icons/tb';
import { VscClose, VscCopy, VscFolderOpened } from 'react-icons/vsc';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import { DropdownMenuItem } from '@/components';
import { Breadcrumb } from '@/components/Breadcrumb';
import Editor from '@/components/editor/Editor';
import {
  defaultEditorMode,
  setCurrentEditFile,
  setEditorEditMode,
  setEditorMode,
  useEditor,
} from '@/controller/editor';
import { workspaceController } from '@/controller/workspace';
import { defaultEditorEditMode } from '@/models/editor';
import { utils } from '@/utils';

import styles from './Index.module.scss';

const EmptyIndex = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <Text as="div" size="4">
        没有打开文件
      </Text>
    </div>
  );
};

const EmptyWorkspaceIndex = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <Text as="div" size="4">
        没有打开工作区
      </Text>
    </div>
  );
};

const moreMenu: DropdownMenuItem[] = [
  {
    id: 'open-folder',
    label: '在资源管理器中显示',
    icon: <VscFolderOpened />,
  },
  {
    id: 'open-file-default',
    label: '使用默认应用打开',
    icon: <MdOutlineFileOpen />,
  },
  {
    id: 'sep-02',
    separator: true,
  },
  {
    id: 'copy-path',
    label: '复制路径',
    icon: <VscCopy />,
  },
  {
    id: 'copy-relative-path',
    label: '复制相对路径',
    icon: <VscCopy />,
  },
  {
    id: 'sep-03',
    separator: true,
  },
  {
    id: 'close-editor',
    label: '关闭编辑器',
    icon: <VscClose />,
  },
];

const TopToolbar = ({ filePath, relativePath }: { filePath: string; relativePath: string }) => {
  const editorMode = useEditor((s) => s.editorMode) || defaultEditorMode;
  const editorEditMode = useEditor((s) => s.editorEditMode) || defaultEditorEditMode;
  const navigate = useNavigate();
  const changeEditorMode = () => {
    const targetMode = editorMode === 'edit' ? 'preview' : 'edit';
    setEditorMode(targetMode);
  };
  const openFolderClick = async () => {
    if (!(await fs.exists(filePath))) {
      toast.error(`路径不存在: ${filePath}`);
      return;
    }
    // console.log('showInFolder:', path);
    fs.showInFolder(filePath);
  };
  const copyPathMenuClick = async (relative: boolean) => {
    let path = relative ? relativePath : filePath;
    if (!relative && utils.detectBrowserAndPlatform().platform === 'windows') {
      path = path.replace(/\//g, '\\');
    }
    navigator.clipboard.writeText(path);
    toast.success('成功');
  };
  const menuClick = (cmd: string) => {
    if (cmd === 'open-folder') {
      openFolderClick();
    } else if (cmd === 'open-file-default') {
      utils.openFile(filePath);
    } else if (cmd === 'copy-path') {
      copyPathMenuClick(false);
    } else if (cmd === 'copy-relative-path') {
      copyPathMenuClick(true);
    } else if (cmd === 'close-editor') {
      setCurrentEditFile(null, true);
    }
  };
  const toToolBtnBack = (val: string) => {
    if (val === 'back') {
      navigate(-1);
    } else {
      navigate(1);
    }
  };
  const changeEditorClick = () => {
    const targetMode = editorEditMode === 'ir' ? 'sv' : 'ir';
    setEditorEditMode(targetMode);
  };
  return (
    <div className={styles.indexContentTopToolbar}>
      <div className={styles.indexContentTopToolbarLeft}>
        <Tooltip content={'返回'}>
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            onClick={() => toToolBtnBack('back')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowBack />
          </Button>
        </Tooltip>
        <Tooltip content={'前进'}>
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            onClick={() => toToolBtnBack('forward')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowForward />
          </Button>
        </Tooltip>
      </div>
      <div className={styles.indexContentTopToolbarCenter}>
        <Breadcrumb.Lazy
          path={relativePath}
          onItemClick={(path) => {
            console.log(path);
          }}
        />
      </div>
      <div className={styles.indexContentTopToolbarRight}>
        <Tooltip content={editorEditMode === 'ir' ? '切换到左右分屏' : '切换到即时渲染'}>
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            color="gray"
            variant="ghost"
            onClick={changeEditorClick}
          >
            {editorEditMode === 'ir' ? (
              <PiSquareSplitHorizontal />
            ) : (
              <TbAlignBoxLeftBottom
                style={{
                  width: '15px',
                  height: '15px',
                }}
              />
            )}
          </Button>
        </Tooltip>
        <Tooltip content={editorMode === 'edit' ? '切换到预览模式' : '切换到编辑模式'}>
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            color="gray"
            variant="ghost"
            onClick={changeEditorMode}
          >
            {editorMode === 'edit' ? <AiOutlineRead /> : <MdOutlineDriveFileRenameOutline />}
          </Button>
        </Tooltip>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button className={styles.indexContentTopToolbarRightBtn} color="gray" variant="ghost">
              <Tooltip content="更多选项" side="bottom">
                <IoMdMore />
              </Tooltip>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {moreMenu.map((m) =>
              m.separator ? (
                <DropdownMenu.Separator key={m.id} />
              ) : (
                <DropdownMenu.Item
                  key={m.id}
                  onClick={() => {
                    menuClick(m.id);
                  }}
                  {...m.props}
                >
                  {m.icon} {m.label}
                </DropdownMenu.Item>
              ),
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  );
};

export default function Index() {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const editorMode = useEditor((s) => s.editorMode) || defaultEditorMode;
  const { file } = useParams();
  const filePath = useMemo(() => (file ? decodeURIComponent(file) : null), [file]);
  const fullPath = useMemo(
    () =>
      filePath && currentWorkspace ? path.join(currentWorkspace.metadata.path, filePath) : null,
    [filePath],
  );
  return (
    <div className={styles.indexRoot}>
      {currentWorkspace == null ? (
        <EmptyWorkspaceIndex />
      ) : filePath == null ? (
        <EmptyIndex />
      ) : (
        <div className={styles.indexContent}>
          <TopToolbar filePath={fullPath!} relativePath={filePath} />
          <Editor
            className={styles.indexContentEditor}
            file={filePath}
            currentWorkspace={currentWorkspace}
            readOnly={editorMode !== 'edit'}
          />
        </div>
      )}
    </div>
  );
}
