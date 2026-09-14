import type { PageServerLoad } from './$types';
import { config } from '$lib/server/config';

export const load: PageServerLoad = async ({ fetch }) => {
	let inviteCodeRequired = true;
	try {
		const res = await fetch(`${config.pdsUrl}/xrpc/com.atproto.server.describeServer`);
		if (res.ok) inviteCodeRequired = Boolean((await res.json()).inviteCodeRequired);
	} catch {
		// keep the conservative default
	}
	return {
		pdsUrl: config.pdsUrl,
		pdsHost: config.pdsHost,
		appUrl: config.appUrl,
		handleDomain: config.handleDomain,
		inviteCodeRequired,
		isLoopback: config.isLoopback
	};
};
