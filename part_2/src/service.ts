import { aggregateMetrics } from "./processor.js";
import type { Provider } from "./providers/types.js";
import type { InsightRepository } from "./repository.js";

// Small class that runs the story in order: pull rows from the ad APIs, save them, then add up the totals.
// Step 1: ask the provider for data (it does HTTP + turning each response into our common row shape).
// Step 2: write those rows to SQLite (skips exact duplicates so you can re-run safely).
// Step 3: read everything back and print-style totals (impressions, spend, averages, etc.).
export class PollAndProcessService {
  constructor(
    private readonly provider: Provider,
    private readonly repository: InsightRepository,
  ) {}

  async run(startDate: string, endDate: string): Promise<Record<string, number>> {
    console.info(`Starting polling for platform=${this.provider.platformName}`);

    const records = await this.provider.fetchRecords(startDate, endDate);

    const inserted = this.repository.insertMany(records);
    console.info(`Persisted ${inserted} records (after dedup)`);

    const rows = this.repository.fetchAll();
    return aggregateMetrics(rows);
  }
}
