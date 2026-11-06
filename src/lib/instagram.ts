const HANDLE = "[A-Za-z0-9._]{1,30}";
const AT = new RegExp(`^@(${HANDLE})$`);
const URL_FORM = new RegExp(`^(?:https?://)?(?:www\.)?instagram\.com/(${HANDLE})/?(?:[?#].*)?$`, "i");

/** `@handle` or an instagram.com profile link → the full profile URL; null if it's neither. */
export function normalizeInstagram(raw: string) {
  const handle = (AT.exec(raw.trim()) ?? URL_FORM.exec(raw.trim()))?.[1];
  return handle ? `https://www.instagram.com/${handle}/` : null;
}
