interface Window {
  initializeSuccess?: boolean;
  navigate?: (
    to: string | number | null,
    opts?: { state?: any; replace?: boolean },
  ) => Promise<void>;
}
