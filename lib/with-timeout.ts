// Guarantees a promise settles.
//
// Nothing in supabase-js bounds how long a request may take, and the player's
// poll loop awaits each one before scheduling the next. A request frozen by iOS
// backgrounding would otherwise stop that loop for the rest of the session.
//
// This races rather than aborts, so the underlying request may still be in
// flight when we give up on it. That is fine here: the only thing that matters
// is that the caller gets an answer and can carry on.

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);

    // Cleared on both paths: a pending timer would keep a handle alive for
    // every request the app ever makes.
    const settle = () => clearTimeout(timer);

    promise.then(
      (value) => {
        settle();
        resolve(value);
      },
      (error: unknown) => {
        settle();
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
