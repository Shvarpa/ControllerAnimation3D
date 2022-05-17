import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { get_binding_group_value } from "svelte/internal";

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
	return ((val / (in_max - in_min)) * (out_max - out_min)) + out_min
}

class ButtonState {
	position: {
		original: THREE.Vector3;
		target: THREE.Vector3;
	};
	color: {
		original: THREE.Color;
		target: THREE.Color;
	};
	click_vector: THREE.Vector3 = new THREE.Vector3(0, 0, -3);
	constructor(public object: THREE.Object3D, public label?: THREE.Mesh) {
		const vec = object.position.clone();
		this.position = {
			original: vec,
			target: vec,
		};
		if (this.label) {
			let material = label.material as THREE.MeshStandardMaterial;
			let color = material.color.clone();
			this.color = { original: color, target: color };
		}
	}
	_value: boolean = false;
	set value(clicked: boolean) {
		this._value = clicked;
		this.position.target = clicked ? this.click_vector.add(this.position.original) : this.position.original;
		if (this.color) this.color.target = clicked ? invert_color(this.color.original) : this.color.original;
	}

	get value() {
		return this._value;
	}

	toggle() {
		this.value = !this.value;
	}

	update(time: any) {
		const t = 0.1 - Math.pow(0.001, time);
		this.object.position.lerp(this.position.target ?? this.position.original, t);
		if (this.color && this.label) (this.label.material as THREE.MeshStandardMaterial).color.lerp(this.color.target, t);
	}

	static back_button(object: THREE.Object3D, label?: THREE.Mesh) {
		let buttonState = new ButtonState(object, label);
		buttonState.click_vector = new THREE.Vector3(0, -3, 0);
		return buttonState;
	}
}
class TriggerState {
	position: {
		original: THREE.Vector3;
		target: THREE.Vector3;
	};
	click_vector: THREE.Vector3 = new THREE.Vector3(0, -5, 0);
	rotation_vector: THREE.Euler = new THREE.Euler(-0.2, -0.03, 0);
	quaternion: {
		original: THREE.Quaternion;
		target: THREE.Quaternion;
	};
	last_update: number = 0;
	axis: THREE.Vector3 = new THREE.Vector3(1,0,0);
	constructor(public object: THREE.Mesh) {
		const quaternion = object.quaternion.clone();
		this.quaternion = {
			original: quaternion,
			target: quaternion,
		};
		const position = object.position.clone();
		this.position = {
			original: position,
			target: position,
		};
	}
	_value: number = 0;
	set value(value: number) {
		value = value > 255 ? 255 : value < 0 ? 0 : value;
		this._value = value;
		// 0.05, 0.1,
		// this.quaternion.target = value == 0 ? this.quaternion.original : new THREE.Quaternion().setFromEuler(this.rotation_vector);
		this.position.target = value == 0 ? this.position.original : this.click_vector.add(this.position.original);
	}

	get center() {
		return this.object.geometry.boundingBox.getCenter(new THREE.Vector3(0, 0, 0));
	}

	get value() {
		return this._value;
	}

	// get matrix multiplication form scene to object
	// const mat = get_chain_matrix(this.object);
	// const center = this.object.geometry.boundingBox.getCenter(new THREE.Vector3(0, 0, 0));
	// let center_4 = new THREE.Vector4(center.x, center.y, center.z, 1);
	// center_4 = center_4.applyMatrix4(mat);
	// console.log(center, center_4);
	// this.object.position.set(center_4.x, center_4.y, center_4.z);

	rotate(axis, theta) {
		const center = this.center;
		this.object.position.sub(center);
		this.object.position.applyAxisAngle(axis, theta);
		this.object.position.add(center);
		this.object.rotateOnAxis(axis, theta);
	}

	update(time: any) {
		const dt = time - this.last_update;
		this.last_update = time;
		
		const t = 1 - Math.pow(0.001, dt);
		console.log(t, dt);
		const theta = remap(this.value, 0, 255, 0, -0.2);
		const center = this.center;
		const position = new THREE.Vector3().copy(this.position.original).sub(center).applyAxisAngle(this.axis, theta).add(center).add(this.click_vector);
		position.multiplyScalar(remap(this.value, 0, 255, 0, 1));
		const quaternion = new THREE.Quaternion().setFromAxisAngle(this.axis, theta)
		this.object.position.lerp(position, t);
		this.object.quaternion.slerp(quaternion, t);
	}
}

class State {
	camera?: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	// light: THREE.Light;
	renderer?: THREE.WebGLRenderer;
	_controller?: THREE.Object3D;
	controls?: OrbitControls;
	buttons: {
		a: ButtonState;
		lb: ButtonState;
		rb: ButtonState;
		rt: TriggerState;
	};

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

	set controller(controller: THREE.Object3D) {
		this.scene.add(controller);
		this._controller = controller;
		this.buttons = {
			a: new ButtonState(controller.getObjectByName("a"), controller.getObjectByName("a-label") as THREE.Mesh),
			lb: ButtonState.back_button(controller.getObjectByName("lb")),
			rb: ButtonState.back_button(controller.getObjectByName("rb")),
			rt: new TriggerState(controller.getObjectByName("rt") as THREE.Mesh),
		};
		setInterval(this.toggle, 2000);
		if (this._should_start) this.start();
	}

	get controller() {
		return this._controller;
	}

	toggle = () => {
		this.buttons.a.toggle();
		this.buttons.lb.toggle();
		this.buttons.rb.toggle();
		this.buttons.rt.value = this.buttons.rt.value == 0 ? 255 : 0;
	};

	animation = (time: any) => {
		// this.controller.rotation.x = (-Math.PI * 0.5) * (time / 5000)
		// this.controller.rotation.x = time / 2000;
		// this.controller.rotation.y = time / 1000;
		// if (Math.floor(time) / 5000 == 0) {
		// 	console.log("pressed");

		// 	this.buttons.a.position.target = new THREE.Vector3(0, 0, -3).add(this.buttons.a.position.original);
		// } else if (Math.floor(time) % 7000 == 0) {
		// 	console.log("original");
		// 	this.buttons.a.position.target = this.buttons.a.position.original;
		// }

		Object.entries(this.buttons).forEach(([key, val]) => {
			val.update(time);
		});
		// Object.entries(this.target_positions).forEach(([key, val]) => {
		// 	(this.buttons[key] as THREE.Object3D).position.lerp(val, t);
		// });
		this.render();
	};

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	_should_start = false;
	start = () => {
		this._should_start = true;
		console.log(this.scene);
		if (!this.controller) return;
		this.renderer.setAnimationLoop(this.animation);
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

export const state = new State();
const loader = new GLTFLoader();
loader.load("assets/models/xbox-controller/scene.gltf", (gtlf) => {
	// console.log(gtlf);
	let controller = gtlf.scene.children[0];
	controller.scale.set(0.02, 0.02, 0.02);
	controller.rotateX(Math.PI * 0.49);
	state.controller = gtlf.scene.children[0];
});
