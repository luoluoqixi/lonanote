import { Form as TamaguiForm } from "tamagui";

import type { FormProps, FormTriggerProps } from "./types";

function FormRoot(props: FormProps) {
  const { children, trigger, triggerProps, ...rootProps } = props;

  return (
    <TamaguiForm {...rootProps}>
      {children}
      {trigger != null ? <FormTrigger {...triggerProps}>{trigger}</FormTrigger> : null}
    </TamaguiForm>
  );
}

function FormTrigger(props: FormTriggerProps) {
  return <TamaguiForm.Trigger asChild={props.asChild ?? true} {...props} />;
}

export const Form = Object.assign(FormRoot, {
  Trigger: FormTrigger,
});
