import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SignInForm from "./sign-in-form";

describe("sign-in heading structure", () => {
  it("renders Welcome Back as the only h1", () => {
    const html = renderToStaticMarkup(<SignInForm callbackUrl="/dashboard" />);
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain("<h1>Welcome Back</h1>");
    expect(html).toContain("<h2>Built for <span>Junk Removal</span> Pros</h2>");
  });
});
