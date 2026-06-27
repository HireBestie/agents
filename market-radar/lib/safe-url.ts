export const MAX_SOURCES = 20;
export const MAX_RESPONSE_BYTES = 1_048_576;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

export function assertPublicHttpUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid source URL: ${urlString}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Blocked source protocol (${url.protocol}). Use http or https only.`);
  }
  if (url.username || url.password) {
    throw new Error("Source URLs must not include credentials.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`Blocked source host: ${hostname}`);
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4 && isPrivateIpv4(ipv4)) {
    throw new Error("Source URLs must be public — private IP ranges are blocked.");
  }
  if (hostname.includes(":") && isBlockedIpv6(hostname)) {
    throw new Error("Source URLs must be public — private IPv6 ranges are blocked.");
  }

  return url;
}

export function assertPublicSourceList(sources: string[]): string[] {
  if (sources.length > MAX_SOURCES) {
    throw new Error(`Too many sources (max ${MAX_SOURCES}).`);
  }
  return sources.map((source) => assertPublicHttpUrl(source).toString());
}

export async function fetchTextWithByteCap(
  url: URL,
  maxBytes = MAX_RESPONSE_BYTES,
): Promise<string> {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, text/html",
    },
    signal: AbortSignal.timeout(12_000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url.toString()}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new Error(
      `Response too large (${buffer.byteLength} bytes, max ${maxBytes}).`,
    );
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}
