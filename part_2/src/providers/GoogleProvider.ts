import type { UnifiedAdRecord } from "../models.js";
import type { ResilientHttpClient } from "../httpClient.js";
import { normalizeGoogleReport } from "../normalizers.js";
import type { Provider } from "./types.js";

// Google-like mock: one report endpoint for everything, Bearer token, next page token string.
export class GoogleProvider implements Provider {
  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken: string,
    private readonly pageSize: number,
    private readonly client: ResilientHttpClient,
  ) {}

  get platformName(): string {
    return "google";
  }

  async fetchRecords(startDate: string, endDate: string): Promise<UnifiedAdRecord[]> {
    const root = this.baseUrl.replace(/\/$/, "");
    const url = `${root}/api/reports/campaigns`;
    const headers = { Authorization: `Bearer ${this.bearerToken}` };
    let pageToken: string | undefined;
    const normalized: UnifiedAdRecord[] = [];

    while (true) {
      const params: Record<string, string | number | undefined> = {
        start_date: startDate,
        end_date: endDate,
        page_size: this.pageSize,
        page_token: pageToken,
      };
      const payload = await this.client.getJson(url, headers, params);
      const reports = payload.reports;
      if (!Array.isArray(reports)) {
        break;
      }
      for (const row of reports) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          normalized.push(normalizeGoogleReport(row as Record<string, unknown>));
        }
      }
      const next = payload.nextPageToken;
      pageToken = typeof next === "string" && next.length > 0 ? next : undefined;
      if (!pageToken) {
        break;
      }
    }
    console.info(`Google fetched records: ${normalized.length}`);
    return normalized;
  }
}
