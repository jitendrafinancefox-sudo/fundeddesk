import { redirect } from 'next/navigation';

// Legacy Angel-terminal entry point retained for existing bookmarks and sidebar links.
// The canonical implementation lives at /portal/terminal.
export default function IndiaTerminalRedirect() {
  redirect('/portal/terminal');
}
