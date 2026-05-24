import type { ComponentProps, ReactNode } from "react";
import type { Form as TamaguiForm } from "tamagui";

export interface FormProps extends ComponentProps<typeof TamaguiForm> {
  trigger?: ReactNode;
  triggerProps?: FormTriggerProps;
}

export type FormTriggerProps = ComponentProps<typeof TamaguiForm.Trigger>;
