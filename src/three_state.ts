import * as THREE from "three";

let geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
let material = new THREE.MeshNormalMaterial();

class State {
	camera?: THREE.PerspectiveCamera;
	scene?: THREE.Scene;
	renderer?: THREE.WebGLRenderer;
	mesh?: THREE.Mesh;

	create_scene() {
		this.scene = new THREE.Scene();
		this.mesh = new THREE.Mesh(geometry, material);
		this.scene.add(this.mesh);
	}

	animation = (time: any) => {
		this.mesh.rotation.x = time / 2000;
		this.mesh.rotation.y = time / 1000;
		this.render();
	};

	render() {
		this.renderer.render(this.scene, this.camera);
	}

	start = () => {
		this.renderer.setAnimationLoop(this.animation);
	};

	bind = (canvas: HTMLCanvasElement) => {
		this.create_scene();
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.01, 10);
		this.camera.position.z = 1;
		const resize_observer = new ResizeObserver((els: ResizeObserverEntry[]) => {
			let [el] = els;
			// console.log(el.contentRect.width, el.contentRect.height);
			canvas.width = el.contentRect.width;
			canvas.height = el.contentRect.height;
			this.renderer.resetState();
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
