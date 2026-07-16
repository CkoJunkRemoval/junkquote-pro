const MAX_SIGNATURE_LENGTH = 250_000;

export function canSaveSignature(
  status: string,
  existingSignature: string | null,
  method: "PublicLink" | "TeamDevice"
) {
  if (existingSignature) return false;
  return method === "PublicLink" ? status === "Sent" : status === "Ready" || status === "Sent";
}

export function validateSignature(name: string, signatureData: string) {
  if (!name.trim()) throw new Error("Signer full name is required.");
  if (!signatureData) throw new Error("A drawn signature is required.");
  if (signatureData.length > MAX_SIGNATURE_LENGTH || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(signatureData)) {
    throw new Error("Signature data is invalid.");
  }
}
