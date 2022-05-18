export const asButton = (item) => (item.match(/^Button(?<index>\d+)(?<sign>\+|\-)?$/i) || {}).groups || {};
export const asAxis = (item) => (item.match(/^(Axis|Axes?)(?<index>\d+)(?<sign>\+|\-)?$/i) || {}).groups || {};

export const xboxToDS4 = {
	DPAD_UP: "DPAD_UP",
	DPAD_DOWN: "DPAD_DOWN",
	DPAD_LEFT: "DPAD_LEFT",
	DPAD_RIGHT: "DPAD_RIGHT",
	START: "OPTIONS",
	BACK: "SHARE",
	LEFT_THUMB: "LEFT_THUMB",
	RIGHT_THUMB: "RIGHT_THUMB",
	LEFT_SHOULDER: "LEFT_SHOULDER",
	RIGHT_SHOULDER: "RIGHT_SHOULDER",
	GUIDE: "PS",
	A: "CROSS",
	B: "CIRCLE",
	X: "SQUARE",
	Y: "TRIANGLE",
	RIGHT_TRIGGER: "RIGHT_TRIGGER",
	LEFT_TRIGGER: "LEFT_TRIGGER",
};

export const ds4ToXbox = {
	DPAD_UP: "DPAD_UP",
	DPAD_DOWN: "DPAD_DOWN",
	DPAD_LEFT: "DPAD_LEFT",
	DPAD_RIGHT: "DPAD_RIGHT",
	PS: "GUIDE",
	TOUCHPAD: "START",
	SQUARE: "X",
	CROSS: "A",
	CIRCLE: "B",
	TRIANGLE: "Y",
	LEFT_SHOULDER: "LEFT_SHOULDER",
	RIGHT_SHOULDER: "RIGHT_SHOULDER",
	SHARE: "BACK",
	OPTIONS: "START",
	LEFT_THUMB: "LEFT_THUMB",
	RIGHT_THUMB: "RIGHT_THUMB",
	RIGHT_TRIGGER: "RIGHT_TRIGGER",
	LEFT_TRIGGER: "LEFT_TRIGGER",
};

export const defXboxConfig = {
	buttons: {
		A: "Button0",
		B: "Button1",
		X: "Button2",
		Y: "Button3",
		LEFT_SHOULDER: "Button4",
		RIGHT_SHOULDER: "Button5",
		BACK: "Button8",
		START: ["Button9", "Button17"],
		LEFT_THUMB: "Button10",
		RIGHT_THUMB: "Button11",
		DPAD_UP: "Button12",
		DPAD_DOWN: "Button13",
		DPAD_LEFT: "Button14",
		DPAD_RIGHT: "Button15",
		GUIDE: "Button16",
	},
	axes_buttons: {},
	axes: {
		LX: "Axis0+",
		LY: "Axis1-",
		RX: "Axis2+",
		RY: "Axis3-",
	},
	buttons_axes: {
		LT: "Button6+",
		RT: "Button7+",
	},
	target: "xbox",
};

export const defDS4Config = {
	buttons: {
		CROSS: "Button0",
		CIRCLE: "Button1",
		SQUARE: "Button2",
		TRIANGLE: "Button3",
		LEFT_SHOULDER: "Button4",
		RIGHT_SHOULDER: "Button5",
		LEFT_TRIGGER: "Button6",
		RIGHT_TRIGGER: "Button7",
		SHARE: "Button8",
		OPTIONS: "Button9",
		LEFT_THUMB: "Button10",
		RIGHT_THUMB: "Button11",
		DPAD_UP: "Button12",
		DPAD_DOWN: "Button13",
		DPAD_LEFT: "Button14",
		DPAD_RIGHT: "Button15",
		PS: "Button16",
		TOUCHPAD: "Button17",
	},
	axes: {
		LX: "Axis0+",
		LY: "Axis1+",
		RX: "Axis2+",
		RY: "Axis3+",
	},
	buttons_axes: {
		LT: "Button6+",
		RT: "Button7+",
	},
	target: "ds4",
};

const getButton = (gamepad, buttons) => {
	const getSingleButton = (button) => (gamepad.buttons[asButton(button).index] || {}).pressed;
	return typeof buttons == "string" ? getSingleButton(buttons) : buttons.map(getSingleButton).includes(true);
};

const getAxisButton = (gamepad, config, axes) => {
	const getSingleAxisButton = (axis) => {
		const { index, sign } = asAxis(axis);
		const value = gamepad.axes[index];
		return (sign == "-" ? -1 : 1) * (value || 0) > (config.deadzone || 0) && value != 0;
	};
	return typeof axes == "string" ? getSingleAxisButton(axes) : axes.map(getSingleAxisButton).includes(true);
};

const getAxes = (gamepad, axes) => {
	const getAxis = (axis) => {
		const { index, sign } = asAxis(axis);
		return (gamepad.axes[index] || 0) * (sign == "-" ? -1 : 1);
	};
	return typeof axes == "string" ? getAxis(axes) : axes.map(getAxis).reduce((prev, curr) => prev + curr, 0);
};

const getButtonAxes = (gamepad, axes) => {
	const getButtonAxis = (axis) => {
		const { index, sign } = asButton(axis);
		return ((gamepad.buttons[index] || {}).value || 0) * (sign == "-" ? -1 : 1);
	};
	return typeof axes == "string" ? getButtonAxis(axes) : axes.map(getButtonAxis).reduce((prev, curr) => prev + curr, 0);
};

function getButtonState(gamepad, config) {
	let values = Object.fromEntries(Object.entries(config.buttons || {}).map(([target, source]) => [target, getButton(gamepad, source)]));
	Object.entries(config.axes_buttons || {}).forEach(([target, source]) => {
		values[target] = values[target] || getAxisButton(gamepad, config, source);
	});
	return values;
}

function getAxesState(gamepad, config) {
	let values = Object.fromEntries(Object.entries(config.axes || {}).map(([target, source]) => [target, getAxes(gamepad, source)]));
	Object.entries(config.buttons_axes || {}).forEach(([target, source]) => {
		values[target] = (values[target] || 0) + getButtonAxes(gamepad, source);
	});
	return values;
}

export function getState(gamepad, config) {
	let buttons = new Proxy(getButtonState(gamepad, config), {
		get: (object, key, proxy) => object[key as string] || object[xboxToDS4[key]] || object[ds4ToXbox[key]],
	});
	return { buttons, axes: getAxesState(gamepad, config) };
}
