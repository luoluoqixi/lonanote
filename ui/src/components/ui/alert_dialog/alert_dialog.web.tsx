import { Dialog } from "../dialog";
import type { AlertDialogProps } from "./types";

export function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} />;
}
