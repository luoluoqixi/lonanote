import { Button, DropdownMenu, Text, Tooltip } from '@radix-ui/themes';
import { AiOutlineRead } from 'react-icons/ai';
import { IoMdArrowBack, IoMdArrowForward, IoMdMore } from 'react-icons/io';
import { MdOutlineDriveFileRenameOutline, MdOutlineFileOpen } from 'react-icons/md';
import { VscCopy, VscFolderOpened } from 'react-icons/vsc';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import { DropdownMenuItem } from '@/components';
import { Breadcrumb } from '@/components/Breadcrumb';
import Editor from '@/components/editor/Editor';
import { defaultEditorMode, setEditorMode, useEditor } from '@/controller/editor';
import { workspaceController } from '@/controller/workspace';
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
];

const TopToolbar = ({ filePath, relativePath }: { filePath: string; relativePath: string }) => {
  const editorMode = useEditor((s) => s.editorMode) || defaultEditorMode;
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
    }
  };
  const toToolBtnBack = (val: string) => {
    if (val === 'back') {
      navigate(-1);
    } else {
      navigate(1);
    }
  };
  return (
    <div className={styles.editorTopToolbar}>
      <div className={styles.editorTopToolbarLeft}>
        <Tooltip content={'返回'}>
          <Button
            className={styles.editorTopToolbarRightBtn}
            onClick={() => toToolBtnBack('back')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowBack />
          </Button>
        </Tooltip>
        <Tooltip content={'前进'}>
          <Button
            className={styles.editorTopToolbarRightBtn}
            onClick={() => toToolBtnBack('forward')}
            color="gray"
            variant="ghost"
          >
            <IoMdArrowForward />
          </Button>
        </Tooltip>
      </div>
      <div className={styles.editorTopToolbarCenter}>
        <Breadcrumb.Lazy
          path={filePath}
          onItemClick={(path) => {
            console.log(path);
          }}
        />
      </div>
      <div className={styles.editorTopToolbarRight}>
        <Tooltip content={editorMode === 'edit' ? '切换到预览模式' : '切换到编辑模式'}>
          <Button
            className={styles.editorTopToolbarRightBtn}
            color="gray"
            variant="ghost"
            onClick={changeEditorMode}
          >
            {editorMode === 'edit' ? <AiOutlineRead /> : <MdOutlineDriveFileRenameOutline />}
          </Button>
        </Tooltip>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button className={styles.editorTopToolbarRightBtn} color="gray" variant="ghost">
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
  const filePath = file ? decodeURIComponent(file) : null;
  return (
    <div className={styles.indexRoot}>
      {currentWorkspace == null ? (
        <EmptyWorkspaceIndex />
      ) : filePath == null ? (
        <EmptyIndex />
      ) : (
        <div className={styles.editorRoot}>
          <TopToolbar filePath={filePath} relativePath={file!} />
          <Editor
            file={filePath}
            currentWorkspace={currentWorkspace}
            readOnly={editorMode !== 'edit'}
          />
        </div>
      )}
    </div>
  );
}
