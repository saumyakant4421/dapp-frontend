import { clickhouse } from "@/lib/clickhouse";

export function toClickHouseDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function parseCampaignInputAsUTC(value: string): Date {
  const raw = String(value || "").trim();
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);

  if (hasTimezone) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid datetime value.");
    }
    return parsed;
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    throw new Error("Invalid datetime format.");
  }

  const [, y, m, d, h, min, s] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(min);
  const second = Number(s ?? "0");

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    throw new Error("Invalid datetime components.");
  }

  // Input from campaign form is intended to be IST local wall-clock time.
  // Convert IST (UTC+05:30) to UTC instant before storage.
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    (5 * 60 + 30) * 60 * 1000;

  const asUtc = new Date(utcMs);
  if (Number.isNaN(asUtc.getTime())) {
    throw new Error("Failed to parse datetime.");
  }

  return asUtc;
}

export async function ensureCampaignTimelinesTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_timelines (
        campaign_id UUID,
        invitation_deadline DateTime,
        start_date DateTime
      )
      ENGINE = MergeTree
      ORDER BY (campaign_id)
    `,
  });
}
