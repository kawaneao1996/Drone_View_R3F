import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { droneLayer } from './droneLayer';
import { getLineInfo, makeLineSeting } from './functions';
import * as turf from '@turf/turf';

mapboxgl.accessToken =
	'pk.eyJ1IjoieW9zaGloaXJvLW0iLCJhIjoiY2x2cGZ4cTJpMDFvOTJpcWkxdWtxYzljayJ9.6bD-Zlgxhn5W3xpIREaU8Q';

const App = () => {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	// const [lng, setLng] = useState<number>(6.5873);
	const [lng, setLng] = useState<number>(141.47229);
	const [lat, setLat] = useState<number>(43.03872);
	const [zoom, setZoom] = useState<number>(13.85);
	const animationDuration = 20000; // 20 秒
	const exaggeration = 1.5;
	const elevation = 120;
	let startTime = 0;
	let path: any = undefined;
	let pathDistance = 0;
	// let dronePosition: mapboxgl.LngLatLike = [6.56674, 45.39881];
	let dronePosition: mapboxgl.LngLatLike = [141.47229, 43.03872];

	// この中でアニメーションを描画していく
	const animation = (frame: number) => {
		if (!map.current) return;

		// ドローンの現在位置の標高を取得する
		const terrainElevation =
			Math.floor(
				map.current.queryTerrainElevation(dronePosition, {
					exaggerated: false,
				}) || 0,
			) * exaggeration;

		// 標高データが読み込み完了してからアニメーションを開始する
		if (!startTime && terrainElevation) {
			startTime = frame;
		}

		if (map.current.getLayer('drone-model')) {
			const droneHeight = terrainElevation + elevation + Math.sin(elevation + frame * 0.01) * 0.5;
			const animationPhase = (frame - startTime) / animationDuration;
			if (animationPhase > 1) {
				// まだドローンが移動する時間になっていなければ上下の揺れだけ表現
				droneLayer.updateLngLat({ altitude: droneHeight });
				// 標高データが読み込み完了してからアニメーションを開始する
			} else if (path && pathDistance && terrainElevation) {
				// ルートを受け取り、戦場にある指定された距離の座標を返す
				const alongPath = turf.along(path, pathDistance * animationPhase).geometry.coordinates;
				const nextDroneLngLat = {
					lng: alongPath[0],
					lat: alongPath[1],
				};
				// ドローンを動かす
				droneLayer.updateLngLat({
					latLng: nextDroneLngLat,
					altitude: droneHeight,
				});
				dronePosition = nextDroneLngLat;
			}

			// 移動したラインの一まで赤くする
			map.current.setPaintProperty('line', 'line-gradient', [
				'step',
				['line-progress'],
				'red',
				animationPhase,
				'rgba(255, 0, 0, 0)',
			]);
		}
		requestAnimationFrame(animation);
	};

	useEffect(() => {
		async function init() {
			// マップの初期セットアップ
			if (map.current) return; // 既に初期化されていたら何もしない
			map.current = new mapboxgl.Map({
				container: mapContainer.current as HTMLDivElement,
				style: 'mapbox://styles/mapbox/streets-v11',
				center: [lng, lat],
				zoom: zoom,
				pitch: 75,
				bearing: 150,
				antialias: true,
			});

			// 移動する座標データを取得する;
			// const [pinRouteGeojson] = await Promise.all([
			// 	fetch('https://docs.mapbox.com/mapbox-gl-js/assets/route-pin.geojson').then((response) =>
			// 		response.json(),
			// 	),
			// 	// データ取得後、mapのloadアクションを実行する
			// 	map.current.once('load'),
			// ]);
			const [pinRouteGeojson] = await Promise.all([
				{
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'LineString',
								coordinates: [
									[141.4722, 43.038],
									[141.47, 43.037],
									[141.468, 43.036],
									[141.466, 43.035],
									[141.464, 43.034],
									[141.462, 43.033],
									[141.46, 43.032],
									[141.458, 43.031],
									[141.456, 43.03],
									[141.454, 43.029],
									[141.453, 43.0278],
								],
							},
						},
					],
				},
				// データ取得後、mapのloadアクションを実行する
				map.current.once('load'),
			]);

			// ルート用のライン追加
			map.current.addSource('route-line', {
				type: 'geojson',
				lineMetrics: true,
				data: pinRouteGeojson as any,
			});
			// ラインを描画
			map.current.addLayer(makeLineSeting('baseLine', 'rgba(0, 255, 0, 1)'));
			map.current.addLayer(makeLineSeting('line', 'rgba(0, 0, 0, 0)'));

			// ルートの距離を計算する
			const routes = pinRouteGeojson.features[0].geometry.coordinates;
			const lineInfo = getLineInfo(routes);
			path = lineInfo.path;
			pathDistance = lineInfo.pathDistance;
			// ドローンのレイヤーを最上位に移動する
			map.current.moveLayer('drone-model');
			animation(0);
		}
		init();
	}, []);

	useEffect(() => {
		// マップの読み込み後
		if (!map.current) return;
		map.current.on('move', () => {
			if (map.current) {
				setLng(Number(map.current.getCenter().lng.toFixed(4)));
				setLat(Number(map.current.getCenter().lat.toFixed(4)));
				setZoom(Number(map.current.getZoom().toFixed(2)));
			}
		});

		map.current.on('load', () => {
			// モデルを描画する
			if (!map.current) return;
			if (map.current.getLayer('drone-model')) {
				return;
			}
			map.current.addLayer(droneLayer);
			// 3D terrainを追加する
			map.current.addSource('mapbox-dem', {
				type: 'raster-dem',
				url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
				tileSize: 512,
				maxzoom: 14,
			});
			map.current.setTerrain({
				source: 'mapbox-dem',
				exaggeration: exaggeration,
			});
		});
	});
	return (
		<div>
			<div style={{ position: 'relative' }}>
				<div className="sidebar">
					Longiude: {lng} | Latitude: {lat} | Zoom: {zoom}
				</div>
				<div className="map-container" ref={mapContainer} />
			</div>
		</div>
	);
};

export default App;
