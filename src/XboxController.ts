import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { getState } from "./conversion";
import { defXboxConfig } from "./conversion";
const invert_color = (color: THREE.Color) => new THREE.Color(255 - color.r, 255 - color.g, 255 - color.b);

const get_scene = (object: THREE.Object3D): THREE.Scene => {
	if (object.parent == null) return object as THREE.Scene;
	return get_scene(object.parent);
};

const get_chain = (object: THREE.Object3D): THREE.Object3D[] => {
	const result: THREE.Object3D[] = [];
	while (object != null) {
		result.unshift(object);
		object = object.parent;
	}
	return result;
};

const get_chain_matrix = (object: THREE.Object3D) => {
	const chain = get_chain(object);
	let m = new THREE.Matrix4().identity();
	for (const o of chain) {
		m = m.multiply(o.matrix);
	}
	return m;
};
const remap = (val: number, in_min: number, in_max: number, out_min: number, out_max) => {
	return ((val - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
};
type Update = (t: number) => void;
type Updater = (strength: number) => (t: number) => void;

const DeltaTime = () => {
	let last_time = 0;
	return (time: number) => {
		const dt = time - last_time;
		last_time = time;
		return dt;
	};
};

const DeltaAlpha = () => {
	const get_dt = DeltaTime();
	return (time: number) => {
		const dt = get_dt(time);
		const t = 0.1 - Math.pow(0.001, dt);
		return t;
	};
};

const COLOR_UPDATER = (object: THREE.Mesh) => {
	const original = (object.material as THREE.MeshStandardMaterial).color.clone();
	return (strength: number) => {
		const target = strength >= 1 ? invert_color(original) : original;
		return (t: number) => {
			(object.material as THREE.MeshStandardMaterial).color.lerp(target, t);
		};
	};
};

const POSITION_UPDATER = (click_vector: THREE.Vector3) => (object: THREE.Object3D) => {
	const original = object.position.clone();
	return (strength: number) => {
		const target = original.clone().add(click_vector.clone().multiplyScalar(strength));
		return (t: number) => {
			object.position.lerp(target, t);
		};
	};
};

const FACE_BUTTON_UPDATER = POSITION_UPDATER(new THREE.Vector3(0, 0, -3));
const BACK_BUTTON_UPDATER = POSITION_UPDATER(new THREE.Vector3(0, -3, 0));

const ROTATION_UPDATER = (axis: THREE.Vector3, target_theta: number, click_vector: THREE.Vector3) => (object: THREE.Mesh) => {
	const position = object.position.clone();
	return (strength: number) => {
		const theta = remap(strength, 0, 1, 0, target_theta);
		const center = object.geometry.boundingBox.getCenter(new THREE.Vector3(0, 0, 0));
		const target_position = position.clone().sub(center).applyAxisAngle(axis, theta).add(center).add(click_vector.clone().multiplyScalar(strength));
		const target_quaternion = new THREE.Quaternion().setFromAxisAngle(axis, theta);
		return (t: number) => {
			object.position.lerp(target_position, t);
			object.quaternion.slerp(target_quaternion, t);
		};
	};
};
const TRIGGER_UPDATER = ROTATION_UPDATER(new THREE.Vector3(1, 0, 0), -0.2, new THREE.Vector3(0, -5, 0));
const AXES_UPDATER = (axisX: THREE.Vector3, axisY: THREE.Vector3) => (object: THREE.Mesh) => {
	const position = object.position.clone();
	return (x: number, y: number) => {
		const thetaX = remap(x, -1, 1, -0.2, 0.2);
		const thetaY = remap(y, -1, 1, -0.2, 0.2);
		const center = object.geometry.boundingBox.getCenter(new THREE.Vector3(0, 0, 0));
		// const target_position = position.clone().sub(center).applyAxisAngle(axisX, thetaX).applyAxisAngle(axisY, thetaY).add(center);
		const positionX = position.clone().sub(center).applyAxisAngle(axisX, thetaX).add(center);
		const positionXY = positionX.clone().sub(center).applyAxisAngle(axisY, thetaY).add(center);
		// const target_quaternion = new THREE.Quaternion().setFromAxisAngle(axisY, thetaY).multiply(new THREE.Quaternion().setFromAxisAngle(axisY, thetaY));
		const quaternionX = new THREE.Quaternion().setFromAxisAngle(axisY, thetaY);
		const quaternionY = new THREE.Quaternion().setFromAxisAngle(axisY, thetaY);
		const quaternionXY = new THREE.Quaternion(quaternionX.x + quaternionY.x, quaternionX.y + quaternionY.y, quaternionX.z + quaternionY.z, quaternionX.w + quaternionY.w);
		return (t: number) => {
			object.position.lerp(positionXY, t);
			object.quaternion.slerp(quaternionXY, t);
		};
	};
};
const NORMAL_AXES_UPDATER = AXES_UPDATER(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0));

class ButtonState {
	object?: THREE.Object3D;
	label?: THREE.Mesh;
	position?: Updater;
	position_update: Update = (t: number) => {};
	color?: Updater;
	color_update: Update = (t: number) => {};
	constructor() {}
	_value: boolean = false;

	set value(clicked: boolean) {
		this._value = clicked;
		const v = clicked ? 1 : 0;
		this.position_update = this.position(v);
		if (this.color) this.color_update = this.color(v);
	}

	get value() {
		return this._value;
	}

	set(value: boolean) {
		this.value = value;
	}

	toggle() {
		this.value = !this.value;
	}

	update(t: any) {
		this.position_update(t);
		this.color_update(t);
	}

	static front_button(object: THREE.Object3D, label?: THREE.Mesh) {
		const button = new ButtonState();
		button.object = object;
		button.position = FACE_BUTTON_UPDATER(object);
		if (label) {
			button.color = COLOR_UPDATER(label);
		}
		return button;
	}

	static back_button(object: THREE.Object3D, label?: THREE.Mesh) {
		const button = new ButtonState();
		button.object = object;
		button.position = BACK_BUTTON_UPDATER(object);
		if (label) {
			button.color = COLOR_UPDATER(label);
		}
		return button;
	}
}
class TriggerState {
	position: Updater;
	position_update: Update = (t: number) => {};
	constructor(public object: THREE.Mesh) {
		this.position = TRIGGER_UPDATER(object);
	}
	_value: number = 0;
	set value(value: number) {
		this._value = value;
		this.position_update = this.position(value);
	}

	get value() {
		return this._value;
	}

	set(value: number) {
		this.value = value;
	}

	update(t: any) {
		this.position_update(t);
	}
}

class AxesState {
	position: (x: number, y: number) => Update;
	position_update: Update = (t: number) => {};
	constructor(public object: THREE.Mesh) {
		this.position = NORMAL_AXES_UPDATER(object);
	}
	_x: number = 0;
	set x(x: number) {
		// x = x > 255 ? 255 : x < 0 ? 0 : x;
		this._x = x;
		this.position_update = this.position(this.x, this.y);
	}

	get x() {
		return this._x;
	}

	_y: number = 0;
	set y(y: number) {
		// y = y > 255 ? 255 : y < 0 ? 0 : y;
		this._y = y;
		this.position_update = this.position(this.x, this.y);
	}

	get y() {
		return this._y;
	}

	set(x: number, y: number) {
		this._x = x;
		this._y = y;
		this.position_update = this.position(this.x, this.y);
	}

	update(t: any) {
		this.position_update(t);
	}
}

let global = {
	x: 0,
	y: 0,
};
export class XboxController {
	renderer?: THREE.WebGLRenderer;
	scene: THREE.Scene;
	camera?: THREE.PerspectiveCamera;
	controls?: OrbitControls;

	_gamepad: any = undefined;
	_controller?: THREE.Object3D;
	LS: AxesState;
	RS: AxesState;
	A: ButtonState;
	B: ButtonState;
	X: ButtonState;
	Y: ButtonState;
	LEFT_SHOULDER: ButtonState;
	RIGHT_SHOULDER: ButtonState;
	RT: TriggerState;
	LT: TriggerState;

	get_t = DeltaAlpha();

	constructor() {
		this.scene = new THREE.Scene();
		const light1 = new THREE.PointLight(0xffffff, 0.8);
		light1.position.set(0, 20, 50);
		this.scene.add(light1);

		const light2 = new THREE.AmbientLight(0xcccccc, 0.2);
		this.scene.add(light2);

		const light3 = new THREE.PointLight(0xffffff, 0.8);
		light3.position.set(0, 0, -50);
		this.scene.add(light3);
	}

	set gamepad(_gamepad: any) {
		this._gamepad = _gamepad;
		const gamepad = _gamepad ? getState(_gamepad, defXboxConfig) : undefined;
		if (!this.controller) return;
		this.LS.set(gamepad.axes.LX, gamepad.axes.LY);
		this.RS.set(gamepad.axes.RX, gamepad.axes.RY);
		this.A.set(gamepad.buttons.A);
		this.B.set(gamepad.buttons.B);
		this.X.set(gamepad.buttons.X);
		this.Y.set(gamepad.buttons.Y);
		this.LEFT_SHOULDER.set(gamepad.buttons.LEFT_SHOULDER);
		this.RIGHT_SHOULDER.set(gamepad.buttons.RIGHT_SHOULDER);
		this.RT.set(gamepad.axes.RT);
		this.LT.set(gamepad.axes.LT);
	}

	get gamepad() {
		return this._gamepad;
	}

	set controller(controller: THREE.Object3D) {
		this.scene.add(controller);
		this._controller = controller;
		this.LS = new AxesState(controller.getObjectByName("ls") as THREE.Mesh);
		this.RS = new AxesState(controller.getObjectByName("rs") as THREE.Mesh);
		this.A = ButtonState.front_button(controller.getObjectByName("a"), controller.getObjectByName("a-label") as THREE.Mesh);
		this.B = ButtonState.front_button(controller.getObjectByName("b"), controller.getObjectByName("b-label") as THREE.Mesh);
		this.X = ButtonState.front_button(controller.getObjectByName("x"), controller.getObjectByName("x-label") as THREE.Mesh);
		this.Y = ButtonState.front_button(controller.getObjectByName("y"), controller.getObjectByName("y-label") as THREE.Mesh);
		this.LEFT_SHOULDER = ButtonState.back_button(controller.getObjectByName("lb"), undefined);
		this.RIGHT_SHOULDER = ButtonState.back_button(controller.getObjectByName("rb"), undefined);
		this.RT = new TriggerState(controller.getObjectByName("rt") as THREE.Mesh);
		this.LT = new TriggerState(controller.getObjectByName("lt") as THREE.Mesh);
	}

	get controller() {
		return this._controller;
	}

	// toggle = () => {
	// 	this.buttons.a.toggle();
	// 	this.buttons.lb.toggle();
	// 	this.buttons.rb.toggle();
	// 	this.buttons.b.toggle();
	// 	this.buttons.rt.value = this.buttons.rt.value == 0 ? 255 : 0;
	// 	global.x = (((global.x + 0.1) * 100) % 100) % 100;
	// 	global.y = (((global.y + 0.1) * 100) % 100) % 100;
	// 	this.axes.ls.set(global.x, global.y);
	// 	console.log(this.gamepad);

	// 	// this.axes.ls.set(this.axes.ls.x == -1 ? 1 : -1, 0);
	// 	// this.axes.rs.set(this.axes.rs.y == -1 ? 1 : -1, 0);
	// };

	animation = (time: any) => {
		const t = this.get_t(time);
		this.LS.update(t);
		this.RS.update(t);
		this.A.update(t);
		this.B.update(t);
		this.X.update(t);
		this.Y.update(t);
		this.LEFT_SHOULDER.update(t);
		this.RIGHT_SHOULDER.update(t);
		this.RT.update(t);
		this.LT.update(t);
		// Object.entries(this.axes).forEach(([key, val]) => {
		// 	val.update(time);
		// });
		// Object.entries(this.buttons).forEach(([key, val]) => {
		// 	val.update(time);
		// });
		this.render();
	};

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	start = () => {
		const loader = new GLTFLoader();
		loader.load("assets/models/xbox-controller/scene.gltf", (gtlf) => {
			// console.log(gtlf);
			let controller = gtlf.scene.children[0];
			controller.scale.set(0.02, 0.02, 0.02);
			controller.rotateX(Math.PI * 0.49);
			this.controller = controller;
			this.renderer.setAnimationLoop(this.animation);
		});
	};

	bind = (canvas: HTMLCanvasElement, data: { aspect?: number } = {}) => {
		const aspect = data.aspect ?? 16 / 9;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		this.camera = new THREE.PerspectiveCamera(5, aspect, 10, 1000);
		this.camera.position.set(0, 0, 50);
		this.controls = new OrbitControls(this.camera, canvas);
		// this.controls.addEventListener("change", console.log);
		const resize_observer = new ResizeObserver((els: ResizeObserverEntry[]) => {
			let [el] = els;
			canvas.width = el.contentRect.height * aspect;
			canvas.height = el.contentRect.height;
			this.renderer.resetState();
			this.controls.update();
		});
		resize_observer.observe(canvas);
		this.start();
		return {
			destroy: () => {
				resize_observer.unobserve(canvas);
				resize_observer.disconnect();
			},
		};
	};
}

const colors = {
	a: 0x00ff00,
	b: 0xff0000,
	x: 0x0000ff,
	y: 0x00ffff,
};
const colors_array = Object.values(colors);
