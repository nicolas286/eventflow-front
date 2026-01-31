// src/domain/helpers/getPublicEventBanner.ts

export function getPublicEventBanner(event: any): string | null {
  return (
    event?.bannerUrl ??
    event?.banner_url ??
    event?.coverUrl ??
    event?.cover_url ??
    null
  );
}
