<script lang="ts">
	import { enhance } from '$app/forms';
	import Thread from './Thread.svelte';
	import type { CommentView } from '$lib/server/queries';

	type Props = {
		comments: CommentView[];
		subjectType: 'link' | 'highlight' | 'comment';
		subjectId: string;
		/** Form action base, e.g. "/link?url=…" */
		action: string;
		depth?: number;
	};
	let { comments, subjectType, subjectId, action, depth = 0 }: Props = $props();

	const here = $derived(comments.filter((c) => c.subjectType === subjectType && c.subjectId === subjectId));
	let replying = $state<string | null>(null);
</script>

{#each here as c (c.id)}
	<div class="comment" style:margin-left="{Math.min(depth, 6) * 1.25}rem">
		<div class="meta">
			<a href="/u/{c.user.username}">{c.user.displayName ?? c.user.username}</a>
			· {new Date(c.createdAt).toLocaleDateString()}
			· <button class="link" onclick={() => (replying = replying === c.id ? null : c.id)}>reply</button>
			{#if c.mine}
				<form method="POST" action="{action}&/deleteComment" use:enhance style="display:inline">
					<input type="hidden" name="id" value={c.id} />
					· <button class="link">delete</button>
				</form>
			{/if}
		</div>
		<p>{c.text}</p>
		{#if replying === c.id}
			<form method="POST" action="{action}&/comment" use:enhance={() => async ({ update }) => { replying = null; await update(); }} class="row">
				<input type="hidden" name="subjectType" value="comment" />
				<input type="hidden" name="subjectId" value={c.id} />
				<input type="text" name="text" placeholder="Reply…" required style="flex:1 1 12rem" />
				<button>Reply</button>
			</form>
		{/if}
		<Thread {comments} subjectType="comment" subjectId={c.id} {action} depth={depth + 1} />
	</div>
{/each}

<style>
	.comment {
		margin: 0.5rem 0;
	}
	.comment p {
		margin: 0.15rem 0 0.3rem;
		white-space: pre-wrap;
	}
</style>
