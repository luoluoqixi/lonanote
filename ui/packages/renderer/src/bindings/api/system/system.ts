export const system = {
  cut: async (): Promise<void> => {
    if (window.api) {
      await window.api.system.cut();
      return;
    }
    throw new Error('未实现cut');
  },
  copy: async (): Promise<void> => {
    if (window.api) {
      await window.api.system.copy();
      return;
    }
    throw new Error('未实现copy');
  },
  paste: async (): Promise<void> => {
    if (window.api) {
      await window.api.system.paste();
      return;
    }
    throw new Error('未实现paste');
  },
  selectAll: async (): Promise<void> => {
    if (window.api) {
      await window.api.system.selectAll();
      return;
    }
    throw new Error('未实现selectAll');
  },
};
