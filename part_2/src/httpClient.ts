import { setTimeout as sleep } from "node:timers/promises";

// Tiny random delay so retries from different requests do not all fire at the same instant.
function randomJitter(max: number): number {
  return Math.random() * max;
}

// All three ad platforms share this: GET JSON, wait and try again on rate limits / server
// errors / flaky network, but fail fast on real client mistakes (wrong URL, bad key, etc.).
export class ResilientHttpClient {
  constructor(
    private readonly timeoutMs: number,
    private readonly maxRetries: number,
    private readonly initialBackoffSeconds: number,
    private readonly maxBackoffSeconds: number,
  ) {}

  // GET with query string, return parsed JSON object, retry when the service is having a bad moment.
  async getJson(
    url: string,
    headers: Record<string, string>,
    params: Record<string, string | number | undefined>,
  ): Promise<Record<string, unknown>> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      search.set(k, String(v));
    }
    const fullUrl = search.size ? `${url}?${search.toString()}` : url;

    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(fullUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 429) {
          if (attempt >= this.maxRetries) {
            throw new Error("Rate limited after retries (HTTP 429).");
          }
          const retryAfter = response.headers.get("Retry-After");
          const forced =
            retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
          await this.sleepWithBackoff(attempt, "rate limit 429", forced);
          attempt += 1;
          continue;
        }

        if (response.status >= 500 && response.status < 600) {
          if (attempt >= this.maxRetries) {
            const text = await response.text();
            throw new Error(`Server error after retries: HTTP ${response.status}, body=${text}`);
          }
          await this.sleepWithBackoff(attempt, `server error HTTP ${response.status}`);
          attempt += 1;
          continue;
        }

        if (response.status >= 400) {
          const text = await response.text();
          throw new Error(`Client error HTTP ${response.status}: ${text}`);
        }

        const json: unknown = await response.json();
        if (json === null || typeof json !== "object" || Array.isArray(json)) {
          throw new Error("Invalid JSON: expected object");
        }
        return json as Record<string, unknown>;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof Error && err.message.startsWith("Client error")) {
          throw err;
        }
        const isAbort = err instanceof Error && err.name === "AbortError";
        const isNetwork =
          err instanceof TypeError ||
          (err instanceof Error && (isAbort || err.message.includes("fetch")));

        if (!isNetwork) {
          throw err;
        }

        if (attempt >= this.maxRetries) {
          throw new Error(`Network error after retries: ${String(err)}`);
        }
        await this.sleepWithBackoff(attempt, `network error: ${String(err)}`);
        attempt += 1;
      }
    }
  }

  // Pause before trying again: honor Retry-After on 429 when we can, otherwise back off with a cap.
  private async sleepWithBackoff(
    attempt: number,
    reason: string,
    forcedSleepSeconds?: number,
  ): Promise<void> {
    let waitSeconds: number;
    if (forcedSleepSeconds !== undefined) {
      waitSeconds = forcedSleepSeconds;
    } else {
      const exponential = this.initialBackoffSeconds * 2 ** attempt;
      const jitter = randomJitter(this.initialBackoffSeconds);
      waitSeconds = Math.min(exponential + jitter, this.maxBackoffSeconds);
    }
    console.warn(`Retrying after ${waitSeconds.toFixed(2)}s due to ${reason}`);
    await sleep(waitSeconds * 1000);
  }
}
