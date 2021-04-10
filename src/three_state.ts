import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
const loader = new GLTFLoader();

class State {
	camera?: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	// light: THREE.Light;
	renderer?: THREE.WebGLRenderer;
	_controller?: THREE.Object3D;
	controls?: OrbitControls;

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
		if (this._should_start) this.start();
	}

	get controller() {
		return this._controller;
	}

	animation = (time: any) => {
		// this.controller.rotation.x = (-Math.PI * 0.5) * (time / 5000)
		// this.controller.rotation.x = time / 2000;
		// this.controller.rotation.y = time / 1000;
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
	console.log(controller);
	// [...Array(14)].forEach((_, i) => {
	// 	let mesh = controller.getObjectByName(`mesh_${i}`) as THREE.Mesh;
	// 	mesh.material = new THREE.MeshBasicMaterial({ color: colors_array[i] ?? 0xffffff });
	// });
	// let mesh_0 = controller.getObjectByName(`mesh_0`) as THREE.Mesh;
	// console.log(mesh_0);

	// mesh_0.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	// let mesh_0 = controller.getObjectByName(`mesh_8`) as THREE.Mesh;
	// let matirial_0 = mesh_0.material as THREE.MeshStandardMaterial;
	// matirial_0.color.set(0xff0000);
	controller.scale.set(0.02, 0.02, 0.02);
	controller.rotateX(Math.PI * 0.49);
	state.controller = gtlf.scene.children[0];
});
