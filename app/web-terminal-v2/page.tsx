import { WorkspaceGrid } from "@v2/components/terminal/workspace";

export default function WebTerminalV2Page() {
  return (
    <main data-testid="web-terminal-v2" className="h-dvh w-full overflow-hidden bg-[var(--v2-background)]">
      <WorkspaceGrid />
    </main>
  );
}
