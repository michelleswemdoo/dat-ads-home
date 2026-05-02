import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Folder that contains package.json — we always load .env from here, not from wherever your terminal is.
const part2Dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(part2Dir, ".env") });

// --- small helpers so the rest of the code can stay simple ---

function envString(key: string, fallback: string): string {
  const v = process.env[key];
  return v !== undefined && v.trim() !== "" ? v.trim() : fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function envCsvList(key: string, fallback: readonly string[]): string[] {
  const v = process.env[key];
  if (v === undefined || v.trim() === "") return [...fallback];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Where the mock APIs live and which keys/tokens to send (see .env.example for names).
export const apiConfig = {
  baseUrl: envString(
    "API_BASE_URL",
    "https://datads-mock-ad-apis.happygrass-47d99234.germanywestcentral.azurecontainerapps.io",
  ),
  facebookApiKey: envString("FACEBOOK_API_KEY", "facebook_test_key_123"),
  googleBearerToken: envString("GOOGLE_BEARER_TOKEN", "google_test_token_456"),
  tiktokBearerToken: envString("TIKTOK_BEARER_TOKEN", "tiktok_test_token_789"),
};

// How far back to poll, how big each page is, and how stubborn we are about retries.
export const pollingConfig = {
  daysBack: envInt("POLLING_DAYS_BACK", 30),
  facebookCampaignIds: envCsvList("FACEBOOK_CAMPAIGN_IDS", [
    "fb_camp_123",
    "fb_camp_456",
    "fb_camp_789",
  ]),
  facebookPageLimit: envInt("FACEBOOK_PAGE_LIMIT", 100),
  googlePageSize: envInt("GOOGLE_PAGE_SIZE", 50),
  tiktokPageLimit: envInt("TIKTOK_PAGE_LIMIT", 25),
  requestTimeoutMs: envInt("REQUEST_TIMEOUT_MS", 20_000),
  maxRetries: envInt("MAX_RETRIES", 5),
  initialBackoffSeconds: envFloat("INITIAL_BACKOFF_SECONDS", 0.5),
  maxBackoffSeconds: envFloat("MAX_BACKOFF_SECONDS", 8.0),
};

// SQLite file path, relative to the part_2 folder (usually data/ads.db).
export const storageConfig = {
  sqliteRelativePath: envString("SQLITE_RELATIVE_PATH", "data/ads.db"),
};

export function getLastNDaysRange(daysBack: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
