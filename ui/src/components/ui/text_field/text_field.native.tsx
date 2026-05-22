import { TextField as HeroUITextField } from "heroui-native";

import { Description } from "../description";
import { FieldError } from "../field_error";
import { Input } from "../input";
import { Label } from "../label";
import type { TextFieldProps } from "./types";

export function TextField({
  accessibilityLabel,
  children,
  className,
  description,
  descriptionClassName,
  errorClassName,
  errorMessage,
  inputProps,
  isDisabled,
  isInvalid,
  isRequired,
  label,
  labelClassName,
  nativeProps,
  webProps,
}: TextFieldProps) {
  void webProps;

  const content = children ?? (
    <>
      {label == null ? null : <Label className={labelClassName}>{label}</Label>}
      <Input
        accessibilityLabel={accessibilityLabel}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        {...inputProps}
      />
      {description == null ? null : (
        <Description className={descriptionClassName}>{description}</Description>
      )}
      {errorMessage == null ? null : (
        <FieldError className={errorClassName} isInvalid={isInvalid}>
          {errorMessage}
        </FieldError>
      )}
    </>
  );

  return (
    <HeroUITextField
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(nativeProps as any)}
    >
      {content}
    </HeroUITextField>
  );
}
