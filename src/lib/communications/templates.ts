const allowedVariables = new Set([
  "company.name", "company.phone", "company.email",
  "customer.firstName", "customer.lastName", "customer.fullName",
  "property.address", "property.city", "property.state", "property.zip",
  "estimate.number", "estimate.total", "estimate.approvalUrl", "estimate.expirationDate",
  "job.number", "job.date", "job.arrivalWindow", "job.status", "job.delayMinutes", "job.portalUrl",
  "invoice.number", "invoice.total", "invoice.balance", "invoice.dueDate", "invoice.paymentUrl",
  "payment.amount", "payment.date",
]);
const token = /\{\{\s*([a-zA-Z][\w.]*)\s*\}\}/g;

export function validateCommunicationTemplate(subject: string | null | undefined, body: string) {
  if (!body.trim()) throw new Error("Template body is required.");
  const unknown = [...`${subject ?? ""}\n${body}`.matchAll(token)].map((match) => match[1]).filter((name) => !allowedVariables.has(name));
  if (unknown.length) throw new Error(`Unknown template variable${unknown.length === 1 ? "" : "s"}: ${[...new Set(unknown)].join(", ")}.`);
  if (body.length > 20_000 || (subject?.length ?? 0) > 300) throw new Error("Template content is too long.");
  return true;
}

export function renderCommunicationTemplate(template: string, variables: Record<string, string | number | null | undefined>) {
  const warnings: string[] = [];
  const value = template.replace(token, (_match, name: string) => {
    if (!allowedVariables.has(name)) {
      warnings.push(`Unknown variable ${name}.`);
      return "";
    }
    const resolved = variables[name];
    if (resolved == null || resolved === "") {
      warnings.push(`Missing runtime variable ${name}.`);
      return "";
    }
    return String(resolved);
  });
  return { value: sanitizeCommunicationText(value), warnings: [...new Set(warnings)] };
}

export function sanitizeCommunicationText(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").replace(/\u0000/g, "").trim();
}

export const safeTemplateVariables = [...allowedVariables].sort();
