import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiConfig, getLastNDaysRange, pollingConfig, storageConfig } from "./config.js";
import { ResilientHttpClient } from "./httpClient.js";
import { CompositeProvider } from "./providers/CompositeProvider.js";
import { FacebookProvider } from "./providers/FacebookProvider.js";
import { GoogleProvider } from "./providers/GoogleProvider.js";
import { TikTokProvider } from "./providers/TikTokProvider.js";
import { InsightRepository } from "./repository.js";
import { PollAndProcessService } from "./service.js";

// This file is what runs when you type npm run start: glue everything together and print totals.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const part2Root = path.resolve(__dirname, "..");
const dbPath = path.join(part2Root, storageConfig.sqliteRelativePath);

async function main(): Promise<number> {
  const { startDate, endDate } = getLastNDaysRange(pollingConfig.daysBack);

  const client = new ResilientHttpClient(
    pollingConfig.requestTimeoutMs,
    pollingConfig.maxRetries,
    pollingConfig.initialBackoffSeconds,
    pollingConfig.maxBackoffSeconds,
  );

  // Facebook, then Google, then TikTok — each does its own HTTP + cleanup into one shared row shape.
  const provider = new CompositeProvider([
    new FacebookProvider(
      apiConfig.baseUrl,
      apiConfig.facebookApiKey,
      pollingConfig.facebookCampaignIds,
      pollingConfig.facebookPageLimit,
      client,
    ),
    new GoogleProvider(
      apiConfig.baseUrl,
      apiConfig.googleBearerToken,
      pollingConfig.googlePageSize,
      client,
    ),
    new TikTokProvider(
      apiConfig.baseUrl,
      apiConfig.tiktokBearerToken,
      pollingConfig.tiktokPageLimit,
      client,
    ),
  ]);

  const repository = new InsightRepository(dbPath);
  const service = new PollAndProcessService(provider, repository);

  try {
    // Full pipeline: fetch+normalize → insert → fetchAll → aggregateMetrics
    const metrics = await service.run(startDate, endDate);
    console.log("\n=== Aggregated Metrics ===");
    for (const [key, value] of Object.entries(metrics)) {
      console.log(`${key}: ${value}`);
    }
    return 0;
  } catch (err) {
    console.error("Part 2 pipeline failed:", err);
    return 1; // non-zero exit so scripts know something broke
  } finally {
    repository.close();
  }
}

void main().then((code) => {
  process.exit(code);
});
