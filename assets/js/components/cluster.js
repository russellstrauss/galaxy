const { Vector3, Clock, MathUtils } = require('three');
// var StartAudioContext = require('startaudiocontext');
// var howler = require('howler');

module.exports = function() {

	var settings = {
		defaultCameraLocation: {
			x: 500,
			y: 500,
			z: 500
		},
		colors: {
			worldColor: new THREE.Color('#000')
		},
		axes: {
			color: 0xffffff,
			count: 20,
			tickLength: 1
		},
		iOS: {
			particleSize: 8,
			starSize: 3
		}
		
	};
	
	var geometry;
	var initialized = false, frameCount = 0;
	var clusterGeometry;
	var colors = ['red', 'blue', 'green', 'white', 'purple', 'pink', 'orange', '#710C96']; // whiskey
	
	var renderer, scene, camera, controls, floor;
	var targetList = [];
	var black = new THREE.Color('black'), white = new THREE.Color('white'), green = new THREE.Color(0x00ff00), red = new THREE.Color('#ED0000'), blue = new THREE.Color(0x0000ff);
	var stats = new Stats();
	
	let interps = [d3.interpolateRainbow, d3.interpolateRgb('#450F66', '#B36002'), d3.interpolateRgb('white', 'red'), d3.interpolateSinebow, d3.interpolateYlOrRd, d3.interpolateYlGnBu,d3.interpolateRdPu, d3.interpolatePuBu, d3.interpolateGnBu, d3.interpolateBuPu, d3.interpolateCubehelixDefault, d3.interpolateCool, d3.interpolateWarm, d3.interpolateCividis, d3.interpolatePlasma, d3.interpolateMagma, d3.interpolateInferno, d3.interpolateViridis, d3.interpolateTurbo, d3.interpolatePurples, d3.interpolateReds, d3.interpolateOranges, d3.interpolateGreys, d3.interpolateGreens, d3.interpolateBlues, d3.interpolateSpectral, d3.interpolateRdYlBu, d3.interpolateRdBu, d3.interpolatePuOr, d3.interpolatePiYG, d3.interpolatePRGn]
	let colorSchemes = [d3.schemeCategory10, d3.schemeAccent, d3.schemeDark2, d3.schemePaired, d3.schemePastel1, d3.schemePastel2, d3.schemeSet1, d3.schemeSet2, d3.schemeSet3, d3.schemeTableau10];
	
	let curve = [], progress = 0, default_camera_speed = .005, camera_speed = default_camera_speed, curve_index = 0, clock, dt, curveObject, catmullRomCurve;
	
	let cameraFocalPoint = new THREE.Vector3(0, 0, 0), origin = new THREE.Vector3(0, 0, 0), particleSpread = 500, trajectory_iteration_count = 40, trajectoryReverse = false;
	
	return {
		
		init: function() {
			this.begin();
		},
		
		begin: function() {
			
			scene = gfx.setUpScene();
			renderer = gfx.setUpRenderer(renderer);
			camera = gfx.setUpCamera(camera);
			scene.background = settings.colors.worldColor;
			controls = gfx.enableControls(controls, renderer, camera);
			gfx.resizeRendererOnWindowResize(renderer, camera);
			gfx.setUpLights();
			gfx.setCameraLocation(camera, settings.defaultCameraLocation);
			this.addStars();
			this.addCluster();
			clock = new THREE.Clock();
			this.createCameraTrajectory();
			this.firstFrame();
			
			var animate = () => {
				requestAnimationFrame(animate);
				controls.update();
				this.everyFrame();
				renderer.render(scene, camera);
			};
			animate(); 
		},
		
		firstFrame: function() {
			camera.lookAt(cameraFocalPoint);
		},
		
		everyFrame: function() {
			
			if (!initialized) this.firstFrame();
			this.updateCamera();
			this.updateParticles();
			frameCount++;
		},
		
		createCameraTrajectory: function() {
			
			let prevPt = null;
			
			let truncateSpiral = 0;
			for (let i = truncateSpiral; i < trajectory_iteration_count - 1; i += 2 * Math.PI / trajectory_iteration_count) {
				
				// # Calculate curve point position
				let radius_scale = 1000;
				let a = .0001;
				let k = .25;
				let spiral_x = radius_scale * a * Math.pow(Math.E, k * i) * Math.cos(i);
				let spiral_y = 500;
				let spiral_z = radius_scale * a * Math.pow(Math.E, k * i) * Math.sin(i);
				let spiralPt = new THREE.Vector3(spiral_x, spiral_y, spiral_z);
				
				if (prevPt !== null) {
					
					let showLine = false;
					if (showLine === true && prevPt != new THREE.Vector3(0, 0, 0)) gfx.drawLineFromPoints(prevPt, spiralPt);
					
					curve.push(spiralPt);
				}
				prevPt = spiralPt
			}
			curve.reverse();
			for (let j = curve.length - 1; j >= 0; j--) { // mirror and append the curve
				curve.push(curve[j]);
			}
			this.catmullRomSpline(curve);
		},
		
		catmullRomSpline: function(curveArray) {
			catmullRomCurve = new THREE.CatmullRomCurve3(curveArray);
			const points = catmullRomCurve.getPoints(curveArray.length);
			const geometry = new THREE.BufferGeometry().setFromPoints( points );
			const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
			curveObject = new THREE.Line( geometry, material );
			// scene.add(curveObject);
		},
		
		updateCamera: function() {
			dt = clock.getDelta();
			clock.start();
	
			let cameraPosition = catmullRomCurve.getPointAt(progress);
			camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
			camera.lookAt(cameraFocalPoint);
			
			
			if (camera.position.distanceTo(origin) < 505) camera_speed = default_camera_speed * (camera.position.distanceTo(origin) - 500) * 100; // prevent spin out at center of log spiral
			else {
				camera_speed = default_camera_speed;
			}
		
			progress += dt * camera_speed;
			if (progress > (1-(dt * camera_speed))) progress = 0;
		},
		
		addStars: function() {
			let geometry = new THREE.BufferGeometry();
			let vertices = [];
			for (let i = 0; i < 10000; i++) {
				vertices.push(THREE.MathUtils.randFloatSpread(4000)); // x
				vertices.push(THREE.MathUtils.randFloatSpread(4000)); // y
				vertices.push(THREE.MathUtils.randFloatSpread(4000)); // z
			}
			
			let size = 1;
			if (utils.iOS() == true) size = settings.iOS.starSize;
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			let particles = new THREE.Points(geometry, new THREE.PointsMaterial({ 
				color: 0x888888,
				size: size
			}));
			scene.add(particles);
		},
		
		addCluster: function() {
			
			clusterGeometry = new THREE.Geometry();
			
			let vertices = [];
			for (let i = 0; i < 20000; i++) {
				let min = -1000;
				let max =  1000;
				let spread = Math.random() * (max - min) + min;
				clusterGeometry.vertices.push(new THREE.Vector3(THREE.MathUtils.randFloatSpread(spread), THREE.MathUtils.randFloatSpread(spread), THREE.MathUtils.randFloatSpread(spread)))
			}
			
			let color1 = new THREE.Color(0, 0, 1);
			let color2 = new THREE.Color(1, 1, 0);
			let colors = this.interpolateD3Colors(clusterGeometry, color1, color2, interps[5], true);
			
			let size = 2;
			if (utils.iOS() == true) size = settings.iOS.particleSize;
			let particles = new THREE.Points(clusterGeometry, new THREE.PointsMaterial({ 
				vertexColors: THREE.VertexColors,
				size: size
			}));
			scene.add(particles);
		},
		
		updateParticles: function() {
			if (clusterGeometry) {
				
				for (let i = 0; i < clusterGeometry.vertices.length; i++) {
					
					let scalar = .01;
					let x = -clusterGeometry.vertices[i].y * scalar; let y = -clusterGeometry.vertices[i].z * scalar; let z =  - clusterGeometry.vertices[i].x * scalar; // galaxy
					let force =  new THREE.Vector3(x, y, z);
					
					let min = -500;
					let max = 4000;
					let maxDistance = 1000  + (Math.random() * (max - min) + min);
					if (clusterGeometry.vertices[i].distanceTo(origin) > maxDistance) clusterGeometry.vertices[i].set(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
					
					clusterGeometry.vertices[i].set(clusterGeometry.vertices[i].x + force.x, clusterGeometry.vertices[i].y + force.y, clusterGeometry.vertices[i].z + force.z);
				}
				clusterGeometry.verticesNeedUpdate = true;
			}
		},
		
		interpolateD3Colors: function(geometry, color1, color2, interpolatorFunc, reverse) {
			
			reverse = reverse || false;
			let colors = [];
			
			let vertexCount = geometry.vertices.length;
			for (let i = 0; i < vertexCount; i++) {
				let interpolator = (i/(vertexCount - 1));
				colors[i] = this.rgbStringToColor(interpolatorFunc(interpolator));
				
				geometry.colors.push(colors[i]);
			}
			if (reverse) colors.reverse();
			return colors;
		},
		
		rgbStringToColor: function(rgbString) {
			rgbString = rgbString.replace('rgb(','').replace(')','').replace(' ','').split(',');
			return new THREE.Color(rgbString[0]/255, rgbString[1]/255, rgbString[2]/255);
		}
	}
}