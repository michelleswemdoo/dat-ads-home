import type { UnifiedAdRecord } from "../models.js";
import type { Provider } from "./types.js";

// Run several real providers one after another and stitch their results into one big list.
export class CompositeProvider implements Provider {
  constructor(private readonly providers: readonly Provider[]) {}

  get platformName(): string {
    return this.providers.map((p) => p.platformName).join(",");
  }

  async fetchRecords(startDate: string, endDate: string): Promise<UnifiedAdRecord[]> {
    const all: UnifiedAdRecord[] = [];
    for (const p of this.providers) {
      const rows = await p.fetchRecords(startDate, endDate);
      all.push(...rows);
    }
    return all;
  }
}
