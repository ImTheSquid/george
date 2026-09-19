// Handle rules, shared so the signup form and the server agree.
// 1–30 chars, lowercase alphanumeric or hyphen, no leading or trailing hyphen.

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

export const USERNAME_RULE = "1–30 lowercase letters, digits, or hyphens.";

export function isValidUsername(input: string): boolean {
  return USERNAME_RE.test(input);
}
