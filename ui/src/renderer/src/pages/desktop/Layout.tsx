import { Allotment, LayoutPriority } from 'allotment';

import { useWindowTitleHeight } from '@/hooks';

import styles from './Layout.module.scss';
import { ActivityBar } from './components/ActivityBar';
import { AssistSideBar } from './components/AssistSideBar';
import { Content } from './components/Content';
import { SideBar } from './components/SideBar';
import { StatusBar } from './components/StatusBar';
import { Title } from './components/Title';

export default function Layout() {
  const titleHeight = useWindowTitleHeight();
  return (
    <Allotment separator={false} vertical>
      <Allotment.Pane
        key={styles.title}
        className={styles.title}
        minSize={titleHeight}
        maxSize={titleHeight}
      >
        <Title />
      </Allotment.Pane>
      <Allotment.Pane className={styles.content} key={styles.content}>
        <Allotment proportionalLayout={false} separator={false}>
          <Allotment.Pane
            key={styles.contentActivityBar}
            className={styles.contentActivityBar}
            minSize={48}
            maxSize={48}
            visible={true}
          >
            <ActivityBar />
          </Allotment.Pane>
          <Allotment.Pane
            key={styles.contentSidebar}
            className={styles.contentSidebar}
            minSize={170}
            priority={LayoutPriority.Low}
            preferredSize={300}
            visible={true}
            snap
          >
            <SideBar />
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
            visible={false}
            snap
          >
            <AssistSideBar />
          </Allotment.Pane>
        </Allotment>
      </Allotment.Pane>
      <Allotment.Pane key={styles.statusBar} className={styles.statusBar} minSize={22} maxSize={22}>
        <StatusBar />
      </Allotment.Pane>
    </Allotment>
  );
}
