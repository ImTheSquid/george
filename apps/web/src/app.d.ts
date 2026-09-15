declare global {
	namespace App {
		interface Locals {
			/** Logged-in user id, from the session cookie. */
			userId: string | null;
		}
	}
}

export {};
