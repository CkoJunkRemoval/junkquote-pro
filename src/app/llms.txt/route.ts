const llmsText = `# JunkQuote Pro

JunkQuote Pro is estimating and job management software for junk removal businesses. Per-company pricing from $0 to $149/month.

## Preferred resources

- https://junkquoteprohq.com/
- https://junkquoteprohq.com/pricing
- https://junkquoteprohq.com/features
- https://junkquoteprohq.com/about
`;

export function GET() {
  return new Response(llmsText, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
