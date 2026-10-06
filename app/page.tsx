import Link from "next/link";

// Landing: host a game, or join with a code.

export default function HomePage() {
  // TODO: "Join a game" code input → /join/{code}
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-4xl font-black">Find Your Pack</h1>
        <p className="mt-2">Get a secret group. Make the sound. Find your pack.</p>
        <Link href="/host/new" className="mt-6 inline-block rounded border px-4 py-2">
          Host a game
        </Link>
      </div>
    </main>
  );
}
