import { describe, expect, it } from "vitest";
import { normalizeUrl, urlHash } from "./url";

describe("normalizeUrl", () => {
  it("drops fragment, credentials, default port, trailing slash", () => {
    expect(normalizeUrl("HTTPS://user:pw@Example.COM:443/a/b/#frag")).toBe("https://example.com/a/b");
  });
  it("keeps root path", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("strips tracking params and sorts the rest", () => {
    expect(normalizeUrl("https://x.io/p?utm_source=a&b=2&a=1&fbclid=zz")).toBe("https://x.io/p?a=1&b=2");
  });
  it("preserves non-default ports and www", () => {
    expect(normalizeUrl("http://www.x.io:8080/")).toBe("http://www.x.io:8080/");
  });
  it("rejects non-http schemes", () => {
    expect(() => normalizeUrl("chrome://extensions")).toThrow();
  });
});

describe("urlHash", () => {
  it("is a stable sha256 hex", async () => {
    expect(await urlHash("https://example.com/")).toBe(
      "0f115db062b7c0dd030b16878c99dea5c354b49dc37b38eb8846179c7783e9d7",
    );
  });
});
