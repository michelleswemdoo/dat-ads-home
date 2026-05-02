// Three familiar ad metrics for a single day + ad line. If we would divide by zero, we return 0 instead.
export function computeRowCtrCpcRoas(
  impressions: number,
  clicks: number,
  spends: number,
  revenue: number,
): { ctr: number; cpc: number; roas: number } {
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cpc = clicks > 0 ? spends / clicks : 0;
  const roas = spends > 0 ? revenue / spends : 0;
  return { ctr, cpc, roas };
}
