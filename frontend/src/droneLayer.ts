import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/Addons.js';

let camera: THREE.Camera;
let scene: THREE.Scene;
let layermap: mapboxgl.Map;
let renderer: THREE.WebGLRenderer;

let modelTransform: {
	translateX: number;
	translateY: number;
	translateZ: number | undefined;
	rotateX: number;
	rotateY: number;
	rotateZ: number;
	scale: number;
};

// モデルが配置されるmap上の座標
// let modelOrigin: mapboxgl.LngLatLike = [6.56674, 45.39881];
let modelOrigin: mapboxgl.LngLatLike = [141.47229, 43.038726];
let modelAltitude = 0;
const modelRotate = [Math.PI / 2, 0, 0];

interface CustomLayer {
	updateLngLat: ({
		latLng,
		altitude,
	}: {
		latLng?: mapboxgl.LngLatLike;
		altitude?: number;
	}) => void;
}

export const droneLayer: mapboxgl.AnyLayer & CustomLayer = {
	id: 'drone-model',
	renderingMode: '3d',
	type: 'custom',

	// レイヤーがマップに追加されたときに呼び出されるオプションのメソッド
	onAdd: (map, gl) => {
		const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
			modelOrigin,
			modelAltitude,
		);
		modelTransform = {
			translateX: modelAsMercatorCoordinate.x,
			translateY: modelAsMercatorCoordinate.y,
			translateZ: modelAsMercatorCoordinate.z,
			rotateX: modelRotate[0],
			rotateY: modelRotate[1],
			rotateZ: modelRotate[2],
			scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
		};

		// ピュアのThree.jsだと引数の設定をしていたが、
		// 始点などはmapbox側での視点になるのでインスタンスだけ生成する
		camera = new THREE.Camera();
		scene = new THREE.Scene();

		// ライトの設定
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
		directionalLight.position.set(1.0, 0.55, 5);
		scene.add(directionalLight);

		// オブジェクトの設定をしていく
		const fbxLoader = new FBXLoader();
		fbxLoader.setResourcePath('/models/Drone_Costum/Teturizer/');
		fbxLoader.load('/models/Drone_Costum/Material/drone_costum.fbx', (obj) => {
			// モデルが大きすぎるので縮小
			obj.scale.set(0.15, 0.15, 0.15);
			scene.add(obj);
		});

		layermap = map;

		// threeJsで描画したオブジェクトをmapboxにマッピングする
		renderer = new THREE.WebGLRenderer({
			// 描画対象のcanvasをmapboxと指定している
			canvas: map.getCanvas(),
			context: gl,
			antialias: true,
		});

		renderer.autoClear = false;
	},
	// レンダー フレーム中に呼び出され、レイヤがGLコンテキストに描画できるようにします
	render: (gl, matrix) => {
		// マップにマッピングしたときに座標を求める
		const rotateX = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(1, 0, 0),
			modelTransform.rotateX,
		);
		const rotateY = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(0, 1, 0),
			modelTransform.rotateY,
		);
		const rotateZ = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(0, 0, 1),
			modelTransform.rotateZ,
		);
		const m = new THREE.Matrix4().fromArray(matrix);
		const l = new THREE.Matrix4()
			.makeTranslation(
				modelTransform.translateX,
				modelTransform.translateY,
				modelTransform.translateZ || 0,
			)
			.scale(
				new THREE.Vector3(
					modelTransform.scale,
					-modelTransform.scale,
					modelTransform.scale,
				),
			)
			.multiply(rotateX)
			.multiply(rotateY)
			.multiply(rotateZ);

		// mapboxの座標ベースでレンダリングする
		camera.projectionMatrix.elements = matrix;
		camera.projectionMatrix = m.multiply(l);
		renderer.state.reset();
		renderer.render(scene, camera);
		layermap.triggerRepaint();
	},
	// 座標、高さの更新
	updateLngLat: ({
		latLng,
		altitude,
	}: {
		latLng?: mapboxgl.LngLatLike;
		altitude?: number;
	}) => {
		if (latLng) {
			modelOrigin = latLng;
		}
		if (altitude) {
			modelAltitude = altitude;
		}
		const updateMercator = mapboxgl.MercatorCoordinate.fromLngLat(
			modelOrigin,
			modelAltitude,
		);
		modelTransform.translateX = updateMercator.x;
		modelTransform.translateY = updateMercator.y;
		modelTransform.translateZ = updateMercator.z;
	},
};
