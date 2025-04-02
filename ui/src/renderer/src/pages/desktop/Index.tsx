import { Button, Text, Tooltip } from '@radix-ui/themes';
import path from 'path-browserify-esm';
import { useMemo } from 'react';
import { AiOutlineRead } from 'react-icons/ai';
import { BsMarkdown } from 'react-icons/bs';
import { FaCode } from 'react-icons/fa6';
import { IoMdArrowBack, IoMdArrowForward, IoMdMore } from 'react-icons/io';
import { MdOutlineDriveFileRenameOutline, MdOutlineFileOpen } from 'react-icons/md';
import { PiSquareSplitHorizontal } from 'react-icons/pi';
import { TbAlignBoxLeftBottom } from 'react-icons/tb';
import { VscClose, VscCopy, VscFolderOpened } from 'react-icons/vsc';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import { Dropdown, DropdownMenuItem } from '@/components';
import { Breadcrumb } from '@/components/Breadcrumb';
import Editor from '@/components/editor/Editor';
import { supportEditorModeChange } from '@/components/editor/markdown';
import {
  defaultEditorBackEnd,
  defaultEditorIsReadOnly,
  defaultEditorMode,
  setCurrentEditFile,
  setEditorBackEnd,
  setEditorIsReadOnly,
  setEditorMode,
  useEditor,
} from '@/controller/editor';
import { workspaceController } from '@/controller/workspace';
import { EditorBackEnd, EditorMode } from '@/models/editor';
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
  {
    id: 'sv',
    label: '左右分屏',
    icon: (
      <PiSquareSplitHorizontal
        style={{
          width: '18px',
          height: '18px',
        }}
      />
    ),
  },
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

const editorBackEndMenu: DropdownMenuItem[] = [
  {
    id: 'milkdown',
    label: 'Milkdown',
    icon: undefined,
  },
  {
    id: 'vditor',
    label: 'Vditor',
    icon: undefined,
  },
  // {
  //   id: 'hypermd',
  //   label: 'HyperMD',
  //   icon: undefined,
  // },
  // {
  //   id: 'codemirror',
  //   label: 'CodeMirror',
  //   icon: undefined,
  // },
];

const TopToolbar = ({ filePath, relativePath }: { filePath: string; relativePath: string }) => {
  const editorIsReadOnly = useEditor((s) => s.editorIsReadOnly) || defaultEditorIsReadOnly;
  const editorMode = useEditor((s) => s.editorMode) || defaultEditorMode;
  const editorBackEnd = useEditor((s) => s.editorBackEnd) || defaultEditorBackEnd;
  const navigate = useNavigate();
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
  const changeEditorModeClick = (cmd: string) => {
    if (cmd && cmd !== editorMode) {
      setEditorMode(cmd as EditorMode);
    }
  };
  const changeEditorBackEndClick = (cmd: string) => {
    if (cmd && cmd !== editorBackEnd) {
      setEditorBackEnd(cmd as EditorBackEnd);
    }
  };
  return (
    <div className={styles.indexContentTopToolbar}>
      <div className={styles.indexContentTopToolbarLeft}>
        <Tooltip content="返回">
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            onClick={() => toToolBtnBack('back')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowBack />
          </Button>
        </Tooltip>
        <Tooltip content="前进">
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
        <Dropdown
          items={editorBackEndMenu}
          onMenuClick={changeEditorBackEndClick}
          selectId={editorBackEnd}
          contentWidth={200}
        >
          <Button className={styles.indexContentTopToolbarRightBtn} color="gray" variant="ghost">
            <Tooltip content="切换编辑器" side="bottom">
              <BsMarkdown style={{ width: '16px', height: '16px' }} />
            </Tooltip>
          </Button>
        </Dropdown>
        <Dropdown
          items={editorModeMenu}
          onMenuClick={changeEditorModeClick}
          selectId={editorMode}
          contentWidth={200}
          triggerProps={{
            disabled: !supportEditorModeChange(editorBackEnd),
          }}
        >
          <Button className={styles.indexContentTopToolbarRightBtn} color="gray" variant="ghost">
            <Tooltip content="切换编辑模式" side="bottom">
              {editorModeMenu.find((item) => item.id === editorMode)?.icon}
            </Tooltip>
          </Button>
        </Dropdown>
        <Tooltip content={editorIsReadOnly ? '切换到编辑模式' : '切换到预览模式'}>
          <Button
            className={styles.indexContentTopToolbarRightBtn}
            color="gray"
            variant="ghost"
            onClick={changeEditorIsReadOnly}
          >
            {editorIsReadOnly ? <MdOutlineDriveFileRenameOutline /> : <AiOutlineRead />}
          </Button>
        </Tooltip>
        <Dropdown items={moreMenu} onMenuClick={menuClick}>
          <Button className={styles.indexContentTopToolbarRightBtn} color="gray" variant="ghost">
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
  const editorIsReadOnly = useEditor((s) => s.editorIsReadOnly) || defaultEditorIsReadOnly;
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
            readOnly={editorIsReadOnly}
          />
        </div>
      )}
    </div>
  );
}
