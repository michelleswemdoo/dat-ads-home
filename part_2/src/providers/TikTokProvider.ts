import type { UnifiedAdRecord } from "../models.js";
import type { ResilientHttpClient } from "../httpClient.js";
import { normalizeTiktokRecord } from "../normalizers.js";
import type { Provider } from "./types.js";

// TikTok-like mock: Bearer token, fixed page size, bump offset until has_more is false.
export class TikTokProvider implements Provider {
  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken: string,
    private readonly pageLimit: number,
    private readonly client: ResilientHttpClient,
  ) {}

  get platformName(): string {
    return "tiktok";
  }

  async fetchRecords(startDate: string, endDate: string): Promise<UnifiedAdRecord[]> {
    const root = this.baseUrl.replace(/\/$/, "");
    const url = `${root}/v1/ad/performance`;
    const headers = { Authorization: `Bearer ${this.bearerToken}` };
    let offset = 0;
    const normalized: UnifiedAdRecord[] = [];

    while (true) {
      const params: Record<string, string | number | undefined> = {
        date_from: startDate,
        date_to: endDate,
        offset,
        limit: this.pageLimit,
      };
      const payload = await this.client.getJson(url, headers, params);
      const data = payload.performance_data;
      if (!Array.isArray(data)) {
        break;
      }
      for (const row of data) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          normalized.push(normalizeTiktokRecord(row as Record<string, unknown>));
        }
      }
      const hasMore = payload.has_more === true;
      if (!hasMore) {
        break;
      }
      const nextOffset = payload.offset;
      offset =
        typeof nextOffset === "number" && Number.isFinite(nextOffset)
          ? nextOffset
          : offset + this.pageLimit;
    }
    console.info(`TikTok fetched records: ${normalized.length}`);
    return normalized;
  }
}
