import type { UnifiedAdRecord } from "../models.js";

// Anything that can “download ads for a date range” implements this. No SQL inside — only HTTP + cleanup.
export interface Provider {
  readonly platformName: string; // for logs; several platforms get joined with commas
  fetchRecords(startDate: string, endDate: string): Promise<UnifiedAdRecord[]>;
}
