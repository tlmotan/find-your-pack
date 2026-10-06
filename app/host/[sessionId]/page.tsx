import { HostDashboard } from "./HostDashboard";

// Host dashboard. The secret is in the URL fragment, so it's read client-side only.

export default async function HostPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <HostDashboard sessionId={sessionId} />;
}
