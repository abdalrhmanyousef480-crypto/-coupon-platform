export const AUTO_IMAGE_START_ISO = "2026-11-04T00:00:00.000Z";

// The new renderer applies only to content created after this cutoff.
// Existing manual cards and archived legacy snapshots must never be regenerated.
export function waitingForAutoCard(record: {
  createdAt: Date;
  cardImageUrl?: string | null;
  legacyImageSnapshotUrl?: string | null;
}): boolean {
  return new Date(record.createdAt).getTime() >= Date.parse(AUTO_IMAGE_START_ISO) &&
    !record.cardImageUrl && !record.legacyImageSnapshotUrl;
}

export function cardImageOrSafeFallback(
  record: { createdAt: Date; cardImageUrl?: string | null; legacyImageSnapshotUrl?: string | null },
  legacyUrl: string,
  logoUrl: string
): string {
  if (record.cardImageUrl) return record.cardImageUrl;
  return waitingForAutoCard(record) ? logoUrl : legacyUrl;
}
