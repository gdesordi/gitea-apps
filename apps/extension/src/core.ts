/** Pure helpers shared by the extension and its unit tests. */
export function parseServerUrl(input: string): URL | undefined {
  try {
    const url = new URL(input.trim());
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname || url.username || url.password) {
      return undefined;
    }
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return undefined;
  }
}

export function ensureTrailingSlash(url: URL): URL {
  const normalized = new URL(url.toString());
  if (!normalized.pathname.endsWith('/')) normalized.pathname += '/';
  return normalized;
}

export function isGiteaUser(value: unknown): value is { id: number; username: string } {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return Number.isInteger(user.id) && typeof user.username === 'string' && user.username.length > 0;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isNotificationThread(value: unknown): value is { id: number | string } {
  if (typeof value !== 'object' || value === null) return false;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'number' || typeof id === 'string';
}

export function parseRemoteRepository(remote: string): { host: string; pathPrefix: string; owner: string; repo: string } | undefined {
  let host: string;
  let pathname: string;
  try {
    if (/^[^/@:]+@[^/:]+:/.test(remote)) {
      const match = remote.match(/^[^/@:]+@([^/:]+):(.+)$/);
      if (!match) return undefined;
      host = match[1];
      pathname = `/${match[2]}`;
    } else {
      const url = new URL(remote);
      if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'ssh:') return undefined;
      host = url.host;
      pathname = url.pathname;
    }
  } catch {
    return undefined;
  }
  pathname = pathname.replace(/\.git$/i, '').replace(/\/$/, '');
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  const owner = parts.at(-2);
  const repo = parts.at(-1);
  const pathPrefix = parts.length > 2 ? `/${parts.slice(0, -2).join('/')}` : '';
  return owner && repo ? { host, pathPrefix, owner, repo } : undefined;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}
