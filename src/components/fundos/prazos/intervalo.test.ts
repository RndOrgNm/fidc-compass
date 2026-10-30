import { describe, expect, it } from "vitest";

import { INTERVALO_OPTIONS, intervaloOptions } from "./intervalo";

describe("intervaloOptions", () => {
  it("offers the standard cadences, up to every two years", () => {
    expect(INTERVALO_OPTIONS.map((option) => option.value)).toEqual([
      "1",
      "2",
      "3",
      "6",
      "12",
      "24",
    ]);
  });

  it("returns the standard options when the interval is one of them", () => {
    expect(intervaloOptions(12)).toBe(INTERVALO_OPTIONS);
    expect(intervaloOptions(24)).toBe(INTERVALO_OPTIONS);
  });

  it("returns the standard options when there is no interval yet", () => {
    expect(intervaloOptions(undefined)).toBe(INTERVALO_OPTIONS);
    expect(intervaloOptions(null)).toBe(INTERVALO_OPTIONS);
  });

  it("adds the stored interval when it is not a standard one, in order", () => {
    const options = intervaloOptions(18);

    expect(options.map((option) => option.value)).toEqual(["1", "2", "3", "6", "12", "18", "24"]);
    expect(options.find((option) => option.value === "18")?.label).toBe("A cada 18 meses");
  });
});
