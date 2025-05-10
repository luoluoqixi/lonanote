import Framework7React, {
  App as F7App,
  View as F7View,
  Link,
  Navbar,
  Page,
  Toolbar,
} from 'framework7-react';
// import Framework7 from 'framework7/lite';
import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';

import { changeToDesktopUI } from '@/controller/settings';

import './Layout.scss';

// import { useWindowTitleHeight } from '@/hooks';

const initFramework7 = () => {
  Framework7.use(Framework7React);
};
initFramework7();

export default function Layout() {
  // const titleHeight = useWindowTitleHeight();
  return (
    <>
      <F7App className="mobileLayout">
        <F7View main>
          <Page>
            <Navbar title="LonaNote"></Navbar>
            <Toolbar bottom>
              <Link onClick={() => changeToDesktopUI()}>Change To Desktop</Link>
            </Toolbar>
            <p>LonaNote Page content</p>
          </Page>
        </F7View>
      </F7App>
    </>
  );
}
