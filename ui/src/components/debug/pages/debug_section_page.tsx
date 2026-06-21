import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";

export function DebugSectionPage({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionPage = definition.Page;

  return <SectionPage />;
}
