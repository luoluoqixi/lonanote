export const reinitEditor = async () => {
  if (window.initEditor != null) {
    window.initEditor!(window.fileName!, window.fileContent!);
  }
};
