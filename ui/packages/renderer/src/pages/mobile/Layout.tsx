import { useWindowTitleHeight } from '@/hooks';

const DesktopTitle = () => {
  const titleHeight = useWindowTitleHeight();
  return <div style={{ height: titleHeight, width: '100%' }}></div>;
};

export default function Layout() {
  return (
    <div>
      <DesktopTitle />
      Mobile Root
    </div>
  );
}
