// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActiveShiftLocation from "./ActiveShiftLocation";

const update = vi.fn();
vi.mock("@/app/actions/timekeeping/timekeeping", () => ({
  updateActiveLocationAction: (...args: unknown[]) => update(...args),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  update.mockReset();
});

describe("ActiveShiftLocation", () => {
  it("does not request or report location while clocked out", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    render(<ActiveShiftLocation active={false} />);
    expect(
      screen.getByText("Location tracking is off while clocked out."),
    ).toBeTruthy();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("reports authorized browser location during an active shift", async () => {
    update.mockResolvedValue({ count: 1 });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: 40, longitude: -73, accuracy: 12 },
          } as GeolocationPosition),
      },
    });
    render(<ActiveShiftLocation active />);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        latitude: 40,
        longitude: -73,
        accuracy: 12,
      }),
    );
    expect(
      await screen.findByText("Location shared with dispatch."),
    ).toBeTruthy();
  });
});
