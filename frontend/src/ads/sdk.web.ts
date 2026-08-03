// Web shim for AdMob — always returns null so the app runs in browser preview.
// Metro auto-picks this file on web (do NOT add Platform.OS checks; the file
// extension is the platform selector).

export function getAdsSdk(): null {
  return null;
}
