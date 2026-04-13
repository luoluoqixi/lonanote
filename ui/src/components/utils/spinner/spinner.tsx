import { Portal, Spinner } from '@radix-ui/themes';

import { ThemeProvider } from '@/components/provider';
import { useGlobalSpinnerStore } from '@/models/global';

let showSpinnerTimeId: number | null = null;

export const showSpinner = (content: string | null) => {
  if (showSpinnerTimeId) {
    window.clearTimeout(showSpinnerTimeId);
    showSpinnerTimeId = null;
  }
  // 延迟一定时间显示Spinner, 当时间过快时不会显示Spinner
  showSpinnerTimeId = window.setTimeout(() => {
    showSpinnerTimeId = null;
    useGlobalSpinnerStore.setState({ open: true, content });
  }, 300);
};

export const hideSpinner = () => {
  if (showSpinnerTimeId) {
    window.clearTimeout(showSpinnerTimeId);
    showSpinnerTimeId = null;
  }
  useGlobalSpinnerStore.setState({ open: false });
};

export const GlobalSpinner = () => {
  const store = useGlobalSpinnerStore();
  return store.open ? (
    <Portal>
      <ThemeProvider style={{ width: '100vw', height: '100vh' }}>
        <div className="spinner-wrap-class">
          <Spinner />
        </div>
      </ThemeProvider>
    </Portal>
  ) : (
    <></>
  );
};
