import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
const loader = new GLTFLoader();

const invert_color = (color: THREE.Color) => new THREE.Color(255 - color.r, 255 - color.g, 255 - color.b);

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
	quaternion: {
		original: THREE.Quaternion;
		target: THREE.Quaternion;
	};
	constructor(public object: THREE.Object3D) {
		const quaternion = object.quaternion.clone();
		this.quaternion = {
			original: quaternion,
			target: quaternion,
		};
	}
	_value: number = 0;
	set value(value: number) {
		value = value > 255 ? 255 : value < 0 ? 0 : value;
		this._value = value;
		this.quaternion.target = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 1, 0));
	}

	get value() {
		return this._value;
	}

	update(time: any) {
		const t = 0.1 - Math.pow(0.001, time);
		this.object.quaternion.slerp(this.quaternion.target, t);
		// this.object.rotateOnAxis(new THREE.Vector3(0, 0, 1), (this.value / 255) * Math.PI);
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
			rt: new TriggerState(controller.getObjectByName("rt")),
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
loader.load("assets/models/xbox-controller/scene.gltf", (gtlf) => {
	// console.log(gtlf);
	let controller = gtlf.scene.children[0];
	controller.scale.set(0.02, 0.02, 0.02);
	controller.rotateX(Math.PI * 0.49);
	state.controller = gtlf.scene.children[0];
});
