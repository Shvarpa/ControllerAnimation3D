<script lang="ts" context="module">
	import CanvasRenderer from "./CanvasRenderer.svelte";
</script>

<script lang="ts">
	import { state } from "./three_state";
</script>

<main>
	<CanvasRenderer />
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
			max-width: 480px;
		}
	}

	@media (min-width: 1280px) {
		main {
			max-width: 1024px;
		}
	}
</style>
