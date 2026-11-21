"use client";
export default function InvitationError({ reset }: { reset: () => void }) {
  return <div className="workspace-theme min-h-screen"><main className="invitation-page"><section className="invitation-card"><h1 className="text-2xl font-semibold">Invitation unavailable</h1><p className="mt-4 text-sm leading-6">Check your connection and account access, or ask the workspace owner for a new private link.</p><button type="button" className="invitation-secondary mt-5" onClick={reset}>Try again</button></section></main></div>;
}
