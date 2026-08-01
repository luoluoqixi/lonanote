import Clipboard from "@react-native-clipboard/clipboard";

/** iOS / Android 原生文字剪切板能力。 */
export const clipboard = {
  readText: (): Promise<string> => Clipboard.getString(),

  writeText: async (text: string): Promise<void> => {
    Clipboard.setString(text);
  },

  clear: async (): Promise<void> => {
    Clipboard.setString("");
  },
};
