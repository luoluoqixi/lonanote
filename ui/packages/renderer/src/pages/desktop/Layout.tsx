import { Allotment, LayoutPriority } from 'allotment';
import clsx from 'clsx';
import { useState } from 'react';

import { useWindowTitleHeight } from '@/hooks';

import Index from './Index';
import './Layout.scss';
import { Settings } from './components/dialogs/settings';
import { WorkspaceManager } from './components/dialogs/workspaceManager';
import { ActivityBar } from './layouts/ActivityBar';
import { AssistSideBar } from './layouts/AssistSideBar';
import { SideBar } from './layouts/SideBar';
import { StatusBar } from './layouts/StatusBar';
import { Title } from './layouts/Title';

export default function Layout() {
  const titleHeight = useWindowTitleHeight();
  const [isDrag, setIsDrag] = useState(false);
  const [tabValue, setTabValue] = useState<string | undefined>('explorer');
  const [showContentSidebar, setShowContentSidebar] = useState(true);
  const [showContentAssistSideBar, setShowContentAssistSideBar] = useState(false);

  const onContentVisibleChange = (index: number, visible: boolean) => {
    if (index === 1) {
      if (showContentSidebar != visible) {
        setShowContentSidebar(visible);
      }
    } else if (index === 3) {
      if (showContentAssistSideBar != visible) {
        setShowContentAssistSideBar(visible);
      }
    }
  };
  const onContentChange = (sizes: number[]) => {
    if (!isDrag) return;
    const count = sizes.length;
    for (let i = 0; i < count; i++) {
      const s = sizes[i];
      const visible = s > 0;
      onContentVisibleChange(i, visible);
    }
  };

  return (
    <>
      <Allotment separator={false} vertical>
        <Allotment.Pane
          key="desktopLayoutTitle"
          className="desktopLayoutTitle"
          minSize={titleHeight + 1}
          maxSize={titleHeight + 1}
        >
          <Title />
        </Allotment.Pane>
        <Allotment.Pane
          className={clsx('rootContent', 'desktopLayoutContent')}
          key="desktopLayoutContent"
        >
          <Allotment
            proportionalLayout={false}
            separator={false}
            onChange={onContentChange}
            onDragStart={() => setIsDrag(true)}
            onDragEnd={() => setIsDrag(false)}
          >
            <Allotment.Pane
              key="desktopLayoutContentActivityBar"
              className={clsx('contentActivityBar', 'desktopLayoutContentActivityBar')}
              minSize={48}
              maxSize={48}
              visible={true}
            >
              <ActivityBar
                tabValue={tabValue}
                onTabChange={setTabValue}
                isShowTabContent={showContentSidebar}
                setShowTabContent={setShowContentSidebar}
              />
            </Allotment.Pane>
            <Allotment.Pane
              key="desktopLayoutContentSidebar"
              className={clsx('contentSidebar', 'desktopLayoutContentSidebar')}
              minSize={170}
              priority={LayoutPriority.Low}
              preferredSize={300}
              visible={showContentSidebar}
              snap
            >
              <SideBar tabValue={tabValue} />
            </Allotment.Pane>
            <Allotment.Pane
              key="desktopLayoutContentContent"
              className={clsx('contentContent', 'desktopLayoutContentContent')}
              minSize={300}
              priority={LayoutPriority.High}
            >
              <Index />
            </Allotment.Pane>
            <Allotment.Pane
              key="desktopLayoutContentAssistSideBar"
              className={clsx('contentAssistSideBar', 'desktopLayoutContentAssistSideBar')}
              minSize={170}
              priority={LayoutPriority.Low}
              preferredSize={300}
              visible={showContentAssistSideBar}
            >
              <AssistSideBar />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane
          key="desktopLayoutStatusBar"
          className={clsx('statusBar', 'desktopLayoutStatusBar')}
          minSize={22}
          maxSize={22}
        >
          <StatusBar />
        </Allotment.Pane>
      </Allotment>
      <WorkspaceManager />
      <Settings />
    </>
  );
}
