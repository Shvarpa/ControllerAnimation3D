import { readable } from "svelte/store";

export const poll = readable([], function start(set) {
	const interval = setInterval(() => {
		let g = navigator.getGamepads();
		let gamepads = [...Array(g.length)].map((_, i) => g[i]);
		set(gamepads);
	}, 1000 / 30);

	return function stop() {
		clearInterval(interval);
	};
});

export default poll;