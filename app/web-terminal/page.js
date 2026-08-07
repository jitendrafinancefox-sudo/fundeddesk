import { redirect } from 'next/navigation';

// Duplicate terminal route — the canonical implementation lives at
// /portal/terminal (auth-gated, full-viewport). Kept as a redirect for
// existing bookmarks and sidebar links.
export default function WebTerminalRedirect() {
  redirect('/portal/terminal');
}
