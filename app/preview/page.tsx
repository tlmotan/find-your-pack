// TEMPORARY dev-only route for eyeballing the player screens without a live
// session. Not part of v1 scope — delete once PlayScreen renders for real.

import { notFound } from "next/navigation";

import { PreviewClient } from "./PreviewClient";

export default function PreviewPage() {
  // Never ship this. A production build 404s the route.
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
