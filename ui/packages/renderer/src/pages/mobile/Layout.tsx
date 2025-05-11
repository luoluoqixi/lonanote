import { changeToDesktopUI } from '@/controller/settings';

import './Layout.scss';

// import { useWindowTitleHeight } from '@/hooks';

export default function Layout() {
  // const titleHeight = useWindowTitleHeight();
  return (
    <>
      <div className="mobileLayout">
        <button onClick={() => changeToDesktopUI()}>Change To Desktop</button>
      </div>
    </>
  );
}
