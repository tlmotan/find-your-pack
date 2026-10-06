import { JoinRedirect } from "./JoinRedirect";

// QR lands here. No form: device token → join_session → /play, or a status screen.

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinRedirect joinCode={code.toUpperCase()} />;
}
