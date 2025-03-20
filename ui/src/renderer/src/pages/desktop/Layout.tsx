import { Allotment, LayoutPriority } from 'allotment';
import { useState } from 'react';

import { useWindowTitleHeight } from '@/hooks';

import styles from './Layout.module.scss';
import { Settings } from './components/dialogs/settings';
import { WorkspaceManager } from './components/dialogs/workspaceManager';
import { ActivityBar } from './layouts/ActivityBar';
import { AssistSideBar } from './layouts/AssistSideBar';
import { Content } from './layouts/Content';
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
          key={styles.title}
          className={styles.title}
          minSize={titleHeight + 1}
          maxSize={titleHeight + 1}
        >
          <Title />
        </Allotment.Pane>
        <Allotment.Pane className={styles.content} key={styles.content}>
          <Allotment
            proportionalLayout={false}
            separator={false}
            onChange={onContentChange}
            onDragStart={() => setIsDrag(true)}
            onDragEnd={() => setIsDrag(false)}
          >
            <Allotment.Pane
              key={styles.contentActivityBar}
              className={styles.contentActivityBar}
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
              key={styles.contentSidebar}
              className={styles.contentSidebar}
              minSize={170}
              priority={LayoutPriority.Low}
              preferredSize={300}
              visible={showContentSidebar}
              snap
            >
              <SideBar tabValue={tabValue} />
            </Allotment.Pane>
            <Allotment.Pane
              key={styles.contentContent}
              className={styles.contentContent}
              minSize={300}
              priority={LayoutPriority.High}
            >
              <Content />
            </Allotment.Pane>
            <Allotment.Pane
              key={styles.contentAssistSideBar}
              className={styles.contentAssistSideBar}
              minSize={170}
              priority={LayoutPriority.Low}
              preferredSize={300}
              visible={showContentAssistSideBar}
              snap
            >
              <AssistSideBar />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane
          key={styles.statusBar}
          className={styles.statusBar}
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
