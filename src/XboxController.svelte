<script context="module">
</script>

<script lang="ts">
	import { XboxController } from "./XboxController";
	export let gamepad = undefined;
	export const xbox = new XboxController();

	$: xbox.gamepad = gamepad;
	
</script>

<canvas use:xbox.bind={{ aspect: 4 / 3 }} />

<style>
	canvas {
		width: 100%;
		height: 100%;
		border: 1px dotted black;
	}
</style>
