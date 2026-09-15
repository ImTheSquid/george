import { randomBytes } from 'node:crypto';

export function newId(bytes = 12): string {
	return randomBytes(bytes).toString('base64url');
}

export function now(): string {
	return new Date().toISOString();
}
