import { Button } from "../button";
import type { IconButtonProps } from "./types";

export function IconButton(props: IconButtonProps) {
  return <Button isIconOnly {...props} />;
}
