export function withExtractionMetadata(result, { siteProfile, strategy, nextStrategy = "" }) {
  return {
    ...result,
    siteType: siteProfile.id,
    siteName: siteProfile.displayName,
    ...(strategy ? { strategy } : {}),
    ...(nextStrategy ? { nextStrategy } : {})
  };
}
