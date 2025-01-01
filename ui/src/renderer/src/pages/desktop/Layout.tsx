import { Allotment, LayoutPriority } from 'allotment';

import { useWindowTitleHeight } from '@/hooks';

import { ActivityBar } from './components/ActivityBar';
import { Content } from './components/Content';
import { RightSideBar } from './components/RightSideBar';
import { SideBar } from './components/SideBar';
import { StatusBar } from './components/StatusBar';
import { Title } from './components/Title';

export default function Layout() {
  const titleHeight = useWindowTitleHeight();

  return (
    <Allotment vertical>
      <Allotment.Pane minSize={titleHeight} maxSize={titleHeight}>
        <Title />
      </Allotment.Pane>
      <Allotment.Pane>
        <Allotment proportionalLayout={false}>
          <Allotment.Pane key="activityBar" minSize={48} maxSize={48} visible={true}>
            <ActivityBar />
          </Allotment.Pane>
          <Allotment.Pane
            key="sidebar"
            minSize={170}
            priority={LayoutPriority.Low}
            preferredSize={300}
            visible={true}
            snap
          >
            <SideBar />
          </Allotment.Pane>
          <Allotment.Pane key="content" minSize={300} priority={LayoutPriority.High}>
            <Content />
          </Allotment.Pane>
          <Allotment.Pane
            key="rightSidebar"
            minSize={170}
            priority={LayoutPriority.Low}
            preferredSize={300}
            visible={false}
            snap
          >
            <RightSideBar />
          </Allotment.Pane>
        </Allotment>
      </Allotment.Pane>
      <Allotment.Pane minSize={22} maxSize={22}>
        <StatusBar />
      </Allotment.Pane>
    </Allotment>
  );
}
