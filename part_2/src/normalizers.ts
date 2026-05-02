import type { UnifiedAdRecord } from "./models.js";

// Turn messy API JSON into our one common row shape. Each platform has its own function below.

function facebookDescription(payload: Record<string, unknown>, adId: string): string {
  const named =
    [payload.ad_name, payload.name, payload.title].find((v) => typeof v === "string" && String(v).trim()) ??
    "";
  const s = String(named).trim();
  if (s) return s;
  return adId ? `Facebook ad ${adId}` : "Facebook insights";
}

export function normalizeFacebookRecord(payload: Record<string, unknown>): UnifiedAdRecord {
  const adId = String(payload.ad_id ?? "");
  return {
    platform: "facebook",
    provider: "facebook",
    campaignId: String(payload.campaign_id ?? ""),
    adId,
    description: facebookDescription(payload, adId),
    campaignDate: String(payload.date ?? ""),
    impressions: Number(payload.impressions ?? 0) || 0,
    clicks: Number(payload.clicks ?? 0) || 0,
    spend: Number(payload.spend ?? 0) || 0,
    revenue: Number(payload.revenue ?? 0) || 0,
  };
}

// Google nests numbers under "metrics" and calls spend "cost" — we flatten that here.
export function normalizeGoogleReport(report: Record<string, unknown>): UnifiedAdRecord {
  const metrics =
    report.metrics && typeof report.metrics === "object" && !Array.isArray(report.metrics)
      ? (report.metrics as Record<string, unknown>)
      : {};
  const adGroupId = String(report.adGroupId ?? "").trim();
  const conv = Number(metrics.conversions ?? 0) || 0;
  const parts = [
    "Google Ads",
    report.campaignId ? `campaign ${report.campaignId}` : "",
    adGroupId ? `ad group ${adGroupId}` : "",
    conv ? `conversions ${conv}` : "",
  ].filter(Boolean);
  const adId = String(report.adId ?? "");
  return {
    platform: "google",
    provider: "google",
    campaignId: String(report.campaignId ?? ""),
    adId,
    description: parts.join(" · ") || (adId ? `Google ad ${adId}` : "Google Ads insights"),
    campaignDate: String(report.date ?? ""),
    impressions: Number(metrics.impressions ?? 0) || 0,
    clicks: Number(metrics.clicks ?? 0) || 0,
    spend: Number(metrics.cost ?? 0) || 0,
    revenue: Number(metrics.conversionValue ?? 0) || 0,
  };
}

// TikTok splits ids and stats into two nested objects; we pull the pieces into one flat row.
export function normalizeTiktokRecord(item: Record<string, unknown>): UnifiedAdRecord {
  const campaign =
    item.campaign && typeof item.campaign === "object" && !Array.isArray(item.campaign)
      ? (item.campaign as Record<string, unknown>)
      : {};
  const performance =
    item.performance && typeof item.performance === "object" && !Array.isArray(item.performance)
      ? (item.performance as Record<string, unknown>)
      : {};
  const adId = String(campaign.ad_id ?? "");
  const purchases = Number(performance.purchases ?? 0) || 0;
  const descParts = [
    "TikTok",
    campaign.id ? `campaign ${campaign.id}` : "",
    purchases ? `purchases ${purchases}` : "",
  ].filter(Boolean);
  return {
    platform: "tiktok",
    provider: "tiktok",
    campaignId: String(campaign.id ?? ""),
    adId,
    description: descParts.join(" · ") || (adId ? `TikTok ad ${adId}` : "TikTok insights"),
    campaignDate: String(performance.date ?? ""),
    impressions: Number(performance.views ?? 0) || 0,
    clicks: Number(performance.engagements ?? 0) || 0,
    spend: Number(performance.budget_spent ?? 0) || 0,
    revenue: Number(performance.purchase_value ?? 0) || 0,
  };
}
