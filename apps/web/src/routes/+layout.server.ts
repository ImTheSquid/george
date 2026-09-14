import type { LayoutServerLoad } from './$types';
import { getActor } from '$lib/server/actors';

export const load: LayoutServerLoad = ({ locals }) => {
	return { user: locals.did ? getActor(locals.did) : null };
};
