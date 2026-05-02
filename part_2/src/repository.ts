import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { computeRowCtrCpcRoas } from "./insightMetrics.js";
import type { UnifiedAdRecord } from "./models.js";

// Talks to SQLite only. The rest of the app hands us plain row objects; we rename a few fields
// to match the database table and fill in click-through rate, cost per click, and return on ad spend per row.
export class InsightRepository {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS insight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        campaign_date TEXT NOT NULL,
        click INTEGER NOT NULL,
        impressions INTEGER NOT NULL,
        spends REAL NOT NULL,
        revenue REAL NOT NULL,
        provider TEXT NOT NULL,
        ctr REAL NOT NULL,
        cpc REAL NOT NULL,
        roas REAL NOT NULL,
        UNIQUE(platform, ad_id, campaign_date)
      )
    `);
    this.migrateFromLegacyAdPerformanceIfPresent();
  }

  // Older builds used a different table name. If we still see that table and our new table is empty,
  // copy the data over once, then delete the old table so we do not run this twice.
  private migrateFromLegacyAdPerformanceIfPresent(): void {
    const legacy = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='ad_performance'`)
      .get() as { name: string } | undefined;
    if (!legacy) return;

    const insightCount = (this.db.prepare(`SELECT COUNT(*) as c FROM insight`).get() as { c: number }).c;
    if (insightCount > 0) {
      this.db.exec(`DROP TABLE IF EXISTS ad_performance`);
      return;
    }

    // Some old databases never had an ad_group_id column — only use it in SQL if it really exists.
    const legacyCols = this.db.prepare(`PRAGMA table_info(ad_performance)`).all() as Array<{ name: string }>;
    const legacyNames = new Set(legacyCols.map((c) => c.name.toLowerCase()));
    const descriptionExpr = legacyNames.has("ad_group_id")
      ? `CASE WHEN TRIM(COALESCE(ad_group_id, '')) != '' THEN 'adGroup ' || ad_group_id ELSE '' END`
      : `''`;

    this.db.exec(`
      INSERT OR IGNORE INTO insight (
        ad_id, campaign_id, platform, description, campaign_date,
        click, impressions, spends, revenue, provider, ctr, cpc, roas
      )
      SELECT
        ad_id,
        campaign_id,
        platform,
        ${descriptionExpr},
        "date",
        clicks,
        impressions,
        spend,
        revenue,
        platform,
        CASE WHEN impressions > 0 THEN CAST(clicks AS REAL) / impressions ELSE 0 END,
        CASE WHEN clicks > 0 THEN CAST(spend AS REAL) / clicks ELSE 0 END,
        CASE WHEN spend > 0 THEN CAST(revenue AS REAL) / spend ELSE 0 END
      FROM ad_performance
    `);
    this.db.exec(`DROP TABLE IF EXISTS ad_performance`);
  }

  // Save many rows in one go. Returns how many were new — same ad+day+platform again is ignored on purpose.
  insertMany(records: UnifiedAdRecord[]): number {
    if (records.length === 0) return 0;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO insight
      (ad_id, campaign_id, platform, description, campaign_date,
       click, impressions, spends, revenue, provider, ctr, cpc, roas)
      VALUES (@adId, @campaignId, @platform, @description, @campaignDate,
              @click, @impressions, @spends, @revenue, @provider, @ctr, @cpc, @roas)
    `);

    const run = this.db.transaction(() => {
      let changes = 0;
      for (const r of records) {
        const { ctr, cpc, roas } = computeRowCtrCpcRoas(
          r.impressions,
          r.clicks,
          r.spend,
          r.revenue,
        );
        const info = stmt.run({
          adId: r.adId,
          campaignId: r.campaignId,
          platform: r.platform,
          description: r.description,
          campaignDate: r.campaignDate,
          click: r.clicks,
          impressions: r.impressions,
          spends: r.spend,
          revenue: r.revenue,
          provider: r.provider,
          ctr,
          cpc,
          roas,
        });
        changes += info.changes;
      }
      return changes;
    });

    return run();
  }

  // Grab every saved row so we can sum them up for the final printed report.
  fetchAll(): Array<Record<string, unknown>> {
    const rows = this.db
      .prepare(
        `
      SELECT platform, campaign_id as campaignId, ad_id as adId, description,
             campaign_date as campaignDate,
             impressions, click as clicks, spends as spend, revenue,
             provider, ctr, cpc, roas
      FROM insight
    `,
      )
      .all() as Array<{
      platform: string;
      campaignId: string;
      adId: string;
      description: string;
      campaignDate: string;
      impressions: number;
      clicks: number;
      spend: number;
      revenue: number;
      provider: string;
      ctr: number;
      cpc: number;
      roas: number;
    }>;

    return rows.map((r) => ({
      platform: r.platform,
      campaign_id: r.campaignId,
      ad_id: r.adId,
      description: r.description,
      campaign_date: r.campaignDate,
      impressions: r.impressions,
      clicks: r.clicks,
      spend: r.spend,
      revenue: r.revenue,
      provider: r.provider,
      ctr: r.ctr,
      cpc: r.cpc,
      roas: r.roas,
    }));
  }

  close(): void {
    this.db.close();
  }
}
