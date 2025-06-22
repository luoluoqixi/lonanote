export const changeColorMode = async (mode: string) => {
  window.colorMode = mode;
  if (window.initEditor != null) {
    window.initEditor!(window.fileName!, window.sourceMode, window.fileContent!);
  }
};
