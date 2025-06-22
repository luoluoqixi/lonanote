export const changeSourceMode = async (mode: boolean) => {
  window.sourceMode = mode;
  window.initEditor!(window.fileName!, window.sourceMode, window.fileContent!);
};
