// curius.app has no documented API, but its reads are public. Shapes below are
// what the site itself consumes (verified 2026-09-14).

const BASE = "https://curius.app/api";

export type CuriusUser = {
  id: number;
  firstName: string;
  lastName: string;
  userLink: string;
  lastOnline?: string;
};

export type CuriusProfile = CuriusUser & {
  school?: string | null;
  twitter?: string | null;
  website?: string | null;
  createdDate?: string;
  followingUsers: CuriusUser[];
  numFollowers?: number;
};

export type CuriusComment = {
  id: number;
  userId: number;
  user: CuriusUser;
  parentId: number | null;
  text: string;
  createdDate: string;
  modifiedDate: string;
  replies: CuriusComment[];
};

export type CuriusHighlight = {
  id: number;
  userId: number;
  linkId: number;
  highlight: string;
  createdDate: string;
  leftContext: string;
  rightContext: string;
  rawHighlight: string;
  comment: CuriusComment | null;
};

export type CuriusTopic = {
  id: number;
  userId: number;
  topic: string;
  slug: string;
  public: boolean;
};

export type CuriusLink = {
  id: number;
  link: string;
  title: string;
  favorite: boolean;
  snippet: string;
  toRead: boolean | null;
  createdBy: number;
  createdDate: string;
  modifiedDate: string;
  comments: CuriusComment[];
  topics: CuriusTopic[];
  highlights: CuriusHighlight[];
  /** Other Curius users who saved the same link. */
  userIds: number[];
};

export type CuriusExport = {
  exportedAt: string;
  profile: CuriusProfile;
  links: CuriusLink[];
};

async function get<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
  const res = await fetchFn(`${BASE}/${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`curius ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchProfile(userLink: string, fetchFn?: typeof fetch): Promise<CuriusProfile> {
  const { user } = await get<{ user: CuriusProfile }>(`users/${encodeURIComponent(userLink)}`, fetchFn);
  return user;
}

/** All of a user's links, saved and to-read, oldest last. Pages until an empty page. */
export async function fetchAllLinks(userId: number, fetchFn?: typeof fetch): Promise<CuriusLink[]> {
  const out: CuriusLink[] = [];
  for (const toRead of [0, 1]) {
    for (let page = 0; ; page++) {
      const { userSaved } = await get<{ userSaved: CuriusLink[] }>(
        `users/${userId}/links?toRead=${toRead}&page=${page}`,
        fetchFn,
      );
      if (userSaved.length === 0) break;
      out.push(...userSaved);
    }
  }
  return out;
}

export async function fetchExport(userLink: string, fetchFn?: typeof fetch): Promise<CuriusExport> {
  const profile = await fetchProfile(userLink, fetchFn);
  const links = await fetchAllLinks(profile.id, fetchFn);
  return { exportedAt: new Date().toISOString(), profile, links };
}

/** The user's slug from a profile URL or bare slug. */
export function parseUserLink(input: string): string {
  const s = input.trim();
  const m = s.match(/curius\.app\/([a-z0-9-]+)/i);
  return (m ? m[1]! : s).toLowerCase();
}
