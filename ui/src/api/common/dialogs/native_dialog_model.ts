export type NativeDialogChoice = {
  key: string;
  text: string;
  style?: string;
};

export type NativeMessageButtonSpec =
  | { kind: "ok"; ok: string }
  | { kind: "okCancel"; ok: string; cancel: string }
  | { kind: "yesNoCancel"; yes: string; no: string; cancel: string };

export type NativeMessageButtonPlan = {
  buttons: NativeMessageButtonSpec;
  resolve: (result: string) => string | undefined;
};

export function mapNativeMessageButtons(
  choices: NativeDialogChoice[],
): NativeMessageButtonPlan | undefined {
  if (choices.length < 1 || choices.length > 3) return undefined;
  if (choices.some((choice) => !choice.key || !choice.text.trim())) return undefined;
  if (new Set(choices.map((choice) => choice.key)).size !== choices.length) return undefined;
  if (new Set(choices.map((choice) => choice.text)).size !== choices.length) return undefined;

  const cancel = choices.filter((choice) => choice.style === "cancel");
  const affirmative = choices.filter((choice) => choice.style !== "cancel");
  let buttons: NativeMessageButtonSpec;
  if (choices.length === 1 && affirmative.length === 1) {
    buttons = { kind: "ok", ok: affirmative[0].text };
  } else if (choices.length === 2 && cancel.length === 1 && affirmative.length === 1) {
    buttons = { kind: "okCancel", ok: affirmative[0].text, cancel: cancel[0].text };
  } else if (choices.length === 3 && cancel.length === 1 && affirmative.length === 2) {
    buttons = {
      kind: "yesNoCancel",
      yes: affirmative[0].text,
      no: affirmative[1].text,
      cancel: cancel[0].text,
    };
  } else {
    return undefined;
  }

  const byText = new Map(choices.map((choice) => [choice.text, choice.key]));
  const cancelKey = cancel[0]?.key;
  return {
    buttons,
    resolve: (result) => {
      if (result === "cancel") return cancelKey;
      if (result.startsWith("custom:")) {
        return byText.get(result.slice("custom:".length)) ?? cancelKey;
      }
      if (result === "ok" || result === "yes") return affirmative[0]?.key ?? cancelKey;
      if (result === "no") return affirmative[1]?.key ?? cancelKey;
      return cancelKey;
    },
  };
}
