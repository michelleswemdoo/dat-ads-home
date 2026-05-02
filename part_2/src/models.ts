// One ad row in our shared shape after normalization; SQLite stores it as `insight` and skips duplicates for the same platform, ad, and day.
export interface UnifiedAdRecord {
  platform: string;
  provider: string;
  campaignId: string;
  adId: string;
  description: string;
  campaignDate: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
}
