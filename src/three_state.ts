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
		// const light1 = new THREE.PointLight(0xff0000, 1, 100);
		// light1.position.set(100, 100, 100);
		this.scene.add(light1);
		const light2 = new THREE.AmbientLight(0xcccccc, 0.4);
		// const light2 = new THREE.AmbientLight(0x404040);
		this.scene.add(light2);
		// this.light = new THREE.AmbientLight(0x404040);
		// this.scene.add(this.light);
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

	bind = (canvas: HTMLCanvasElement) => {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.01, 1000);
		this.camera.position.set(0, 0, 5);
		this.controls = new OrbitControls(this.camera, canvas);
		// this.controls.addEventListener("change", console.log);
		const resize_observer = new ResizeObserver((els: ResizeObserverEntry[]) => {
			let [el] = els;
			// console.log(el.contentRect.width, el.contentRect.height);
			canvas.width = el.contentRect.width;
			canvas.height = el.contentRect.height;
			this.renderer.resetState();
			this.controls.update();
			// three_state.renderer.setSize(el.contentRect.width, el.contentRect.height);
			// const rect = el.target.getBoundingClientRect();
			// three_state.renderer.setSize(rect.width, rect.height);
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

export const state = new State();
loader.load("assets/models/xbox-controller/scene.gltf", (gtlf) => {
	// console.log(gtlf);
	let controller = gtlf.scene.children[0];
	console.log(controller);
	let mesh_0 = controller.getObjectByName("mesh_0") as THREE.Mesh;
	let matirial_0 = mesh_0.material as THREE.MeshStandardMaterial;
	matirial_0.color.set(0xff0000)
	controller.scale.set(0.02, 0.02, 0.02);
	controller.rotateX(Math.PI * 0.49);
	state.controller = gtlf.scene.children[0];
});
