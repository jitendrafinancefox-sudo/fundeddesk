import { redirect } from 'next/navigation';

// Legacy terminal entry point retained for existing bookmarks and sidebar links.
// The canonical implementation lives at /portal/terminal.
export default function TerminalRedirect() {
  redirect('/portal/terminal');
}
