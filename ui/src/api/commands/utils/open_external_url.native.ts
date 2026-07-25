import * as Linking from "expo-linking";

export async function openExternalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
