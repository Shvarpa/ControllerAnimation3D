<script lang="ts" context="module">
	import XboxController from "./XboxController.svelte";
</script>

<script lang="ts">
	import poll from "./poll";
</script>

<main>
	<!-- <XboxController {gamepad} size={600} /> -->
	{#each $poll as gamepad, index (index)}
		{#if gamepad}
			<XboxController {gamepad} />
			<p>{gamepad.id}</p>
		{:else}
			<p>Not A Gamepad #{index}</p>
		{/if}
	{/each}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	/* h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	} */

	@media (min-width: 640px) {
		main {
			max-width: 640px;
		}
	}

	@media (min-width: 1280px) {
		main {
			max-width: 1280px;
		}
	}
</style>
