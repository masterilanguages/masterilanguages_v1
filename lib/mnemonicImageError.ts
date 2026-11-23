/** User-facing text for a failed mnemonic image or sentence call. */
export function mnemonicImageErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const cleaned = raw.replace(/^FunctionsHttpError:?\s*/i, "").trim();
  if (
    !cleaned ||
    /edge function returned a non-2xx/i.test(cleaned) ||
    cleaned === "Failed to fetch" ||
    /failed to fetch/i.test(cleaned)
  ) {
    return "Mnemonic image could not be generated. Check the image provider keys and try again.";
  }
  return cleaned.length > 320 ? `${cleaned.slice(0, 317)}…` : cleaned;
}
