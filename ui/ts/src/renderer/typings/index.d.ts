declare const __APP_VERSION__: string;

interface Window {
  initializeSuccess?: boolean;
  navigate?: (to: string, options?: { replace?: boolean; state?: any }) => void;

  setSearchParams?: (name: string, value: string | null) => void;
  getSearchParams?: (name?: string) => string | URLSearchParams | null;
  useSearchParams?: () => {
    [k: string]: string;
  };

  navigateFile?: (to: string | number | null) => void;
  backFile?: () => void;
  forwardFile?: () => void;
  useFileHistory?: () => {
    history: string[];
    currentIndex: number;
  };
  clearFileHistory?: () => void;
  getCurrentFile?: () => string | null;
}
