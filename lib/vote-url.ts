/**
 * The address guests scan to vote. Built from the host the TV itself loaded, so
 * the QR always points at the site the scoreboard is on (production, a preview
 * deploy, or the laptop on the home network) with no env var to keep in sync.
 *
 * Pure: no framework imports, so it is unit tested directly.
 */

// A plain host with an optional port. Anything else (paths, "@", spaces) is not
// a host we should print on a TV and ask people to open.
const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

// Machines that are only reachable on the local network never have https.
const LOCAL_HOST_PATTERN =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)(:\d+)?$/i;

/**
 * @param host           the request's `host` header
 * @param forwardedProto the `x-forwarded-proto` header, if a proxy sent one
 * @returns the full `/vote` URL, or `null` when the host is missing or not a plain host[:port]
 */
export function buildVoteUrl(
  host: string | null | undefined,
  forwardedProto: string | null | undefined,
): string | null {
  const h = host?.trim();
  if (!h || !HOST_PATTERN.test(h)) return null;

  const proto = forwardedProto?.split(',')[0]?.trim().toLowerCase();
  const scheme =
    proto === 'http' || proto === 'https' ? proto : LOCAL_HOST_PATTERN.test(h) ? 'http' : 'https';

  return `${scheme}://${h}/vote`;
}
