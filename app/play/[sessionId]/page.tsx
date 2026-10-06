import { PlayScreen } from "./PlayScreen";

// Waiting → countdown → reveal → hidden ("Make your sound!" + pack size).

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { sessionId } = await params;
  const { code } = await searchParams;
  return <PlayScreen sessionId={sessionId} joinCode={code ?? ""} />;
}
