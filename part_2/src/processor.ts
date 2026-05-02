function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0; // totals would blow up to Infinity without this guard
  return numerator / denominator;
}

// Add up every row in the database and turn that into the headline numbers you see at the end of a run.
// (Also tolerates older field names like "click" vs "clicks" so we do not break if the shape drifts.)
export function aggregateMetrics(rows: Array<Record<string, unknown>>): Record<string, number> {
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalRevenue = 0;

  for (const r of rows) {
    totalImpressions += Number(r.impressions ?? 0) || 0;
    totalClicks += Number(r.clicks ?? r.click ?? 0) || 0;
    totalSpend += Number(r.spend ?? r.spends ?? 0) || 0;
    totalRevenue += Number(r.revenue ?? 0) || 0;
  }

  const averageCtr = safeDivide(totalClicks, totalImpressions);
  const averageCpc = safeDivide(totalSpend, totalClicks);
  const averageRoas = safeDivide(totalRevenue, totalSpend);

  return {
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_spend: Math.round(totalSpend * 10_000) / 10_000,
    total_revenue: Math.round(totalRevenue * 10_000) / 10_000,
    average_ctr: Math.round(averageCtr * 1_000_000) / 1_000_000,
    average_cpc: Math.round(averageCpc * 1_000_000) / 1_000_000,
    average_roas: Math.round(averageRoas * 1_000_000) / 1_000_000,
  };
}
