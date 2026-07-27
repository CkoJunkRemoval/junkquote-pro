import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { togglePasswordVisibility } from "./PasswordInput";

const source = (path: string) => readFileSync(path, "utf8");

describe("PasswordInput", () => {
  it("is hidden by default, reveals, hides again, and preserves its value", () => {
    const initial = { visible: false, value: "correct horse battery staple" };
    const revealed = togglePasswordVisibility(initial);
    const hidden = togglePasswordVisibility(revealed);
    expect(revealed).toEqual({ visible: true, value: initial.value });
    expect(hidden).toEqual(initial);
  });

  it("keeps paired password visibility independent", () => {
    const password = togglePasswordVisibility({ visible: false, value: "one" });
    const confirmation = { visible: false, value: "one" };
    expect(password.visible).toBe(true);
    expect(confirmation.visible).toBe(false);
  });

  it("uses a non-submit button with updating accessible labels", () => {
    const component = source("src/components/forms/PasswordInput.tsx");
    expect(component).toContain('type="button"');
    expect(component).toContain('"Show password"');
    expect(component).toContain('"Hide password"');
    expect(component).toContain('useState(false)');
    expect(component).toContain('visible ? "text" : "password"');
  });

  it("is shared by sign-in and every account-creation/reset flow", () => {
    for (const path of [
      "src/app/sign-in/sign-in-form.tsx",
      "src/app/sign-up/sign-up-form.tsx",
      "src/app/join/page.tsx",
      "src/app/reset-password/reset-password-form.tsx",
    ])
      expect(source(path)).toContain("PasswordInput");
  });
});
