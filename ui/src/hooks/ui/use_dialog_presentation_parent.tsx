import { type ReactNode, createContext, useContext } from "react";

const DialogPresentationParent = createContext<string | undefined>(undefined);

export function DialogPresentationParentProvider({
  requestId,
  children,
}: {
  requestId: string;
  children: ReactNode;
}) {
  return (
    <DialogPresentationParent.Provider value={requestId}>
      {children}
    </DialogPresentationParent.Provider>
  );
}

export function useDialogPresentationParent() {
  return useContext(DialogPresentationParent);
}
