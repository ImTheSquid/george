declare global {
	namespace App {
		interface Locals {
			/** DID of the logged-in user, from the session cookie. */
			did: string | null;
		}
	}
}

export {};
