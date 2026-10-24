import type { OSType } from "./platform";

type WorkspaceResourceScope = {
  scopeId: string;
  generation: number;
};

export function createWorkspaceResourceEndpoint(
  scope: WorkspaceResourceScope,
  targetOs: OSType | "web",
): string {
  if (targetOs === "windows") {
    return `http://lonanote-resource.localhost/resource/${scope.scopeId}/${scope.generation}`;
  }
  return `lonanote-resource://resource/${scope.scopeId}/${scope.generation}`;
}
