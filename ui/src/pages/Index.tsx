import { Button, Text, Tooltip } from '@radix-ui/themes';
import path from 'path-browserify-esm';
import { useMemo } from 'react';
import { AiOutlineRead } from 'react-icons/ai';
import { FaCode } from 'react-icons/fa6';
import { IoMdArrowBack, IoMdArrowForward, IoMdMore } from 'react-icons/io';
import { MdOutlineDriveFileRenameOutline, MdOutlineFileOpen } from 'react-icons/md';
import { TbAlignBoxLeftBottom } from 'react-icons/tb';
import { VscClose, VscCopy, VscFolderOpened } from 'react-icons/vsc';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import { Dropdown, DropdownMenuItem } from '@/components';
import { Breadcrumb } from '@/components/Breadcrumb';
import Editor from '@/components/editor/Editor';
import { EditorMode } from '@/components/editor/types';
import {
  defaultEditorIsReadOnly,
  defaultEditorMode,
  setCurrentEditFileIf,
  setEditorIsReadOnly,
  setEditorMode,
  useEditorData,
} from '@/controller/editor';
import { useSettings } from '@/controller/settings';
import { workspaceController } from '@/controller/workspace';
import { utils } from '@/utils';

import './Index.scss';
import { useSearchParams } from './routes';

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

const editorModeMenu: DropdownMenuItem[] = [
  {
    id: 'ir',
    label: '即时渲染',
    icon: (
      <TbAlignBoxLeftBottom
        style={{
          marginLeft: 1.5,
          width: '15px',
          height: '15px',
        }}
      />
    ),
  },
  // 左右分屏, 先不做吧
  // {
  //   id: 'sv',
  //   label: '左右分屏',
  //   icon: (
  //     <PiSquareSplitHorizontal
  //       style={{
  //         width: '18px',
  //         height: '18px',
  //       }}
  //     />
  //   ),
  // },
  {
    id: 'source',
    label: '源码模式',
    icon: (
      <FaCode
        style={{
          width: '16px',
          height: '16px',
        }}
      />
    ),
  },
];

const TopToolbar = ({ filePath, relativePath }: { filePath: string; relativePath: string }) => {
  const editorIsReadOnly = useEditorData((s) => s.editorIsReadOnly) || defaultEditorIsReadOnly;
  const editorMode = useEditorData((s) => s.editorMode) || defaultEditorMode;
  const isDirty = useEditorData((s) => s.currentEditorIsDirty);
  const autoSave = useSettings((s) => s.settings?.autoSave);
  const autoSaveFocusChange = useSettings((s) => s.settings?.autoSaveFocusChange);
  const showDirty = !autoSave && !autoSaveFocusChange;

  const fileHistory = window.useFileHistory?.();
  const [canBack, canForward] = useMemo(() => {
    const index = fileHistory?.currentIndex;
    const history = fileHistory?.history;
    if (index == null || history == null) {
      return [false, false];
    }

    const canBack = index > 0;
    const canForward = index < history.length - 1;

    return [canBack, canForward];
  }, [fileHistory]);

  // console.log(fileHistory?.currentIndex, fileHistory?.history);

  const changeEditorIsReadOnly = () => {
    const targetMode = !editorIsReadOnly;
    setEditorIsReadOnly(targetMode);
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
      setCurrentEditFileIf(null, true);
    }
  };
  const toToolBtnBack = (val: string) => {
    if (val === 'back') {
      window.backFile?.();
    } else {
      window.forwardFile?.();
    }
  };
  const changeEditorModeClick = (cmd: string) => {
    if (cmd && cmd !== editorMode) {
      setEditorMode(cmd as EditorMode);
    }
  };
  return (
    <div className="desktopIndexContentTopToolbar">
      <div className="desktopIndexContentTopToolbarLeft">
        <Tooltip content="返回">
          <Button
            disabled={!canBack}
            className="desktopIndexContentTopToolbarRightBtn"
            onClick={() => toToolBtnBack('back')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowBack />
          </Button>
        </Tooltip>
        <Tooltip content="前进">
          <Button
            disabled={!canForward}
            className="desktopIndexContentTopToolbarRightBtn"
            onClick={() => toToolBtnBack('forward')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowForward />
          </Button>
        </Tooltip>
      </div>
      <div className="desktopIndexContentTopToolbarCenter">
        <Breadcrumb.Lazy
          path={relativePath}
          onItemClick={(path) => {
            console.log(path);
          }}
        />
        <div style={{ height: '20px', marginLeft: 2 }}>{showDirty && isDirty && '*'}</div>
      </div>
      <div className="desktopIndexContentTopToolbarRight">
        <Dropdown
          items={editorModeMenu}
          onMenuClick={changeEditorModeClick}
          selectId={editorMode}
          contentWidth={200}
        >
          <Button className="desktopIndexContentTopToolbarRightBtn" color="gray" variant="ghost">
            <Tooltip content="切换编辑模式" side="bottom">
              {editorModeMenu.find((item) => item.id === editorMode)?.icon}
            </Tooltip>
          </Button>
        </Dropdown>
        <Tooltip content={editorIsReadOnly ? '切换到编辑模式' : '切换到预览模式'}>
          <Button
            className="desktopIndexContentTopToolbarRightBtn"
            color="gray"
            variant="ghost"
            onClick={changeEditorIsReadOnly}
          >
            {editorIsReadOnly ? <MdOutlineDriveFileRenameOutline /> : <AiOutlineRead />}
          </Button>
        </Tooltip>
        <Dropdown items={moreMenu} onMenuClick={menuClick}>
          <Button className="desktopIndexContentTopToolbarRightBtn" color="gray" variant="ghost">
            <Tooltip content="更多选项" side="bottom">
              <IoMdMore />
            </Tooltip>
          </Button>
        </Dropdown>
      </div>
    </div>
  );
};

export default function Index() {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const editorIsReadOnly = useEditorData((s) => s.editorIsReadOnly) || defaultEditorIsReadOnly;
  const { file } = useSearchParams();
  const filePath = useMemo(() => window.getCurrentFile?.(), [file]);
  const fullPath = useMemo(
    () =>
      filePath && currentWorkspace ? path.join(currentWorkspace.metadata.path, filePath) : null,
    [filePath],
  );
  return (
    <div className="desktopIndexRoot">
      {currentWorkspace == null ? (
        <EmptyWorkspaceIndex />
      ) : filePath == null ? (
        <EmptyIndex />
      ) : (
        <div className="desktopIndexContent">
          <TopToolbar filePath={fullPath!} relativePath={filePath} />
          <Editor
            className="desktopIndexContentEditor"
            file={filePath}
            currentWorkspace={currentWorkspace}
            readOnly={editorIsReadOnly}
          />
        </div>
      )}
    </div>
  );
}
