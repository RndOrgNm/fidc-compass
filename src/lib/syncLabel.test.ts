import { describe, expect, it } from "vitest";

import { syncLabel } from "./syncLabel";

const now = new Date("2026-10-22T20:30:00Z");

describe("syncLabel", () => {
  it("says how long ago the OneDrive was checked, in Portuguese", () => {
    expect(syncLabel("2026-10-22T20:18:00Z", now)).toBe("há 12 minutos");
    expect(syncLabel("2026-10-22T17:30:00Z", now)).toBe("há 3 horas");
  });

  it("is undefined when the time is unknown or not a date, so nothing is shown", () => {
    expect(syncLabel(null, now)).toBeUndefined();
    expect(syncLabel(undefined, now)).toBeUndefined();
    expect(syncLabel("not a date", now)).toBeUndefined();
  });
});
