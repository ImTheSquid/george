#!/usr/bin/env node
// Usage: curius-export <userLink or profile URL> > curius-export.json
import { fetchExport, parseUserLink } from "../src/index.ts";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: curius-export <userLink>");
  process.exit(2);
}
const data = await fetchExport(parseUserLink(arg));
console.error(`${data.profile.userLink}: ${data.links.length} links, ${data.links.reduce((n, l) => n + l.highlights.length, 0)} highlights`);
process.stdout.write(JSON.stringify(data, null, 2));
