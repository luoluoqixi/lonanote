import { useCallback, useEffect, useRef, useState } from "react";

import { type ExternalWorkspaceStorageBindingRequest, workspace } from "@/api/commands/workspace";
import { getErrorMessage } from "@/api/common/error_message";
import { selectWorkspaceStorageFolder } from "@/api/common/workspace_storage_selection";

export function useWorkspaceStorageTarget() {
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [managedProviderIds, setManagedProviderIds] = useState<string[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [directoryName, setDirectoryName] = useState("");
  const [externalBinding, setExternalBinding] =
    useState<ExternalWorkspaceStorageBindingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const choosingRef = useRef(false);
  const isManaged = providerId !== null && managedProviderIds.includes(providerId);

  const load = useCallback(async (preferredProviderId?: string, initialDirectoryName = "") => {
    const request = ++requestRef.current;
    setProviderIds([]);
    setManagedProviderIds([]);
    setProviderId(null);
    setDirectoryName(initialDirectoryName);
    setExternalBinding(null);
    setError(null);
    setIsLoading(true);
    try {
      const [all, managed] = await Promise.all([
        workspace.listStorageProviderIds(),
        workspace.listManagedStorageProviderIds(),
      ]);
      if (request !== requestRef.current) return;
      setProviderIds(all);
      setManagedProviderIds(managed);
      setProviderId(
        preferredProviderId && all.includes(preferredProviderId)
          ? preferredProviderId
          : (managed.find((id) => all.includes(id)) ?? all[0] ?? null),
      );
    } catch (nextError) {
      if (request === requestRef.current) setError(getErrorMessage(nextError, "无法加载存储位置"));
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  }, []);

  const changeProvider = useCallback((nextProviderId: string | null) => {
    requestRef.current += 1;
    setProviderId(nextProviderId);
    setExternalBinding(null);
    setError(null);
  }, []);

  const chooseFolder = useCallback(
    async (title = "选择工作区文件夹") => {
      if (!providerId || choosingRef.current) return;
      choosingRef.current = true;
      const request = requestRef.current;
      setIsChoosing(true);
      setError(null);
      try {
        const binding = await selectWorkspaceStorageFolder(providerId, title);
        if (binding && request === requestRef.current) setExternalBinding(binding);
      } catch (nextError) {
        if (request === requestRef.current) setError(getErrorMessage(nextError, "选择文件夹失败"));
      } finally {
        choosingRef.current = false;
        setIsChoosing(false);
      }
    },
    [providerId],
  );

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  return {
    providerIds,
    managedProviderIds,
    providerId,
    directoryName,
    externalBinding,
    isLoading,
    isChoosing,
    isManaged,
    error,
    load,
    changeProvider,
    setDirectoryName,
    chooseFolder,
  };
}
