import { describe, expect, it } from "vitest";
import { renderCommunicationTemplate, sanitizeCommunicationText, validateCommunicationTemplate } from "./templates";

describe("communication templates", () => {
  it("validates safe variables and rejects unknown variables", () => {
    expect(validateCommunicationTemplate("Hi {{customer.firstName}}", "{{job.arrivalWindow}}")).toBe(true);
    expect(() => validateCommunicationTemplate(null, "{{process.env.SECRET}}")).toThrow("Unknown template variable");
  });
  it("renders safely and reports missing runtime variables", () => {
    const result = renderCommunicationTemplate("Hi {{customer.firstName}} {{company.phone}}", { "customer.firstName": "Kai" });
    expect(result.value).toBe("Hi Kai");
    expect(result.warnings).toContain("Missing runtime variable company.phone.");
  });
  it("sanitizes HTML and scripts", () => {
    expect(sanitizeCommunicationText("<b>Hello</b><script>steal()</script>")).toBe("Hello");
  });
});
