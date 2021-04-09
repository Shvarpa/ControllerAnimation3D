<script context="module">
</script>

<script lang="ts">
	import { state } from "./three_state";
</script>

<canvas use:state.bind></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
		border: 1px dotted black;
	}
</style>
