import type { UnifiedAdRecord } from "../models.js";
import type { ResilientHttpClient } from "../httpClient.js";
import { normalizeFacebookRecord } from "../normalizers.js";
import type { Provider } from "./types.js";

// Calls the Facebook-like mock: one URL per campaign, pages forward with an "after" cursor, API key header.
export class FacebookProvider implements Provider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly campaignIds: readonly string[],
    private readonly pageLimit: number,
    private readonly client: ResilientHttpClient,
  ) {}

  get platformName(): string {
    return "facebook";
  }

  async fetchRecords(startDate: string, endDate: string): Promise<UnifiedAdRecord[]> {
    const all: UnifiedAdRecord[] = [];
    const root = this.baseUrl.replace(/\/$/, "");

    for (const campaignId of this.campaignIds) {
      const rows = await this.fetchCampaign(root, campaignId, startDate, endDate);
      console.info(`Campaign ${campaignId} fetched records: ${rows.length}`);
      all.push(...rows);
    }
    return all;
  }

  private async fetchCampaign(
    root: string,
    campaignId: string,
    startDate: string,
    endDate: string,
  ): Promise<UnifiedAdRecord[]> {
    const url = `${root}/api/v1/campaigns/${campaignId}/insights`;
    const headers = { "x-api-key": this.apiKey };
    let nextCursor: string | undefined;
    const normalized: UnifiedAdRecord[] = [];

    while (true) {
      const params: Record<string, string | number | undefined> = {
        since: startDate,
        until: endDate,
        limit: this.pageLimit,
        after: nextCursor,
      };
      const payload = await this.client.getJson(url, headers, params);
      const data = payload.data;
      if (!Array.isArray(data)) {
        break;
      }
      for (const row of data) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          normalized.push(normalizeFacebookRecord(row as Record<string, unknown>));
        }
      }
      const paging = payload.paging;
      const next =
        paging && typeof paging === "object" && !Array.isArray(paging)
          ? (paging as Record<string, unknown>).next
          : undefined;
      nextCursor = typeof next === "string" ? next : undefined;
      if (!nextCursor) {
        break;
      }
    }
    return normalized;
  }
}
