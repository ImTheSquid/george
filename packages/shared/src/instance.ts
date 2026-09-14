// Instance-wide constants. Everything else derives from these.
export const INSTANCE = {
  appUrl: "https://george.jackhogan.me",
  pdsUrl: "https://pds.jackhogan.me",
  handleDomain: "george.jackhogan.me",
  nsid: "me.jackhogan.george",
} as const;

export const COLLECTIONS = {
  link: `${INSTANCE.nsid}.link`,
  highlight: `${INSTANCE.nsid}.highlight`,
  comment: `${INSTANCE.nsid}.comment`,
  follow: `${INSTANCE.nsid}.follow`,
  profile: `${INSTANCE.nsid}.profile`,
} as const;

export type Collection = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
export const ALL_COLLECTIONS: Collection[] = Object.values(COLLECTIONS);
