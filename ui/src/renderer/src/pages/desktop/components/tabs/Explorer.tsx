import React from 'react';
import {
  StaticTreeDataProvider,
  Tree,
  TreeItem,
  TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

import { Workspace } from '@/bindings/api';
import { Button, Heading } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';

import styles from './Explorer.module.scss';

const readTemplate = (
  template: Record<string, any>,
  data: { items: Record<TreeItemIndex, TreeItem<any>> } = { items: {} },
) => {
  for (const [key, value] of Object.entries(template)) {
    data.items[key] = {
      index: key,
      canMove: true,
      isFolder: value !== null,
      children: value !== null ? Object.keys(value as object) : undefined,
      data: key,
      canRename: true,
    };

    if (value !== null) {
      readTemplate(value, data);
    }
  }
  return data;
};

const longTreeTemplate = {
  root: {
    Fruit: {
      Apple: null,
      Orange: null,
      Lemon: null,
      Berries: {
        Strawberry: null,
        Blueberry: null,
      },
      Banana: null,
    },
    Meals: {
      America: {
        SmashBurger: null,
        Chowder: null,
        Ravioli: null,
        MacAndCheese: null,
        Brownies: null,
      },
      Europe: {
        Risotto: null,
        Spaghetti: null,
        Pizza: null,
        Weisswurst: null,
        Spargel: null,
      },
      Asia: {
        Curry: null,
        PadThai: null,
        Jiaozi: null,
        Sushi: null,
      },
      Australia: {
        PotatoWedges: null,
        PokeBowl: null,
        LemonCurd: null,
        KumaraFries: null,
      },
    },
    Desserts: {
      Cookies: null,
      IceCream: null,
    },
    Drinks: {
      PinaColada: null,
      Cola: null,
      Juice: null,
    },
  },
};

export const longTree = readTemplate(longTreeTemplate);

const onOpenWorkspace = async () => {
  await workspaceManagerController.selectOpenWorkspace();
};

const NoWorkspace = () => {
  return (
    <div className={styles.noWorkspace}>
      <Heading size="sm">没有打开工作区</Heading>
      <div className={styles.handleButtonList}>
        <Button size="xs" className={styles.handleButton} onClick={onOpenWorkspace}>
          打开工作区（文件夹）
        </Button>
        {/* <Button size="xs" className={styles.handleButton}>
          同步工作区（Webdav）
        </Button> */}
      </div>
    </div>
  );
};

interface WorkspaceExplorerProps {
  workspace: Workspace;
}

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  return (
    <div>
      {workspace.metadata.name}
      <UncontrolledTreeEnvironment
        dataProvider={
          new StaticTreeDataProvider(longTree.items, (item, data) => ({ ...item, data }))
        }
        getItemTitle={(item) => item.data}
        viewState={{}}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
    </div>
  );
};

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  return (
    <div className={styles.explorer}>
      {currentWorkspace == null ? (
        <NoWorkspace />
      ) : (
        <WorkspaceExploreer workspace={currentWorkspace} />
      )}
    </div>
  );
};

export default Explorer;
