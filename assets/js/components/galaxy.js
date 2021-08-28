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
	
	var clusterGeometry, initialized = false, frameCount = 0;
	var renderer, scene, camera, controls;
	let interps = [d3.interpolateRainbow, d3.interpolateRgb('#450F66', '#B36002'), d3.interpolateRgb('white', 'red'), d3.interpolateSinebow, d3.interpolateYlOrRd, d3.interpolateYlGnBu,d3.interpolateRdPu, d3.interpolatePuBu, d3.interpolateGnBu, d3.interpolateBuPu, d3.interpolateCubehelixDefault, d3.interpolateCool, d3.interpolateWarm, d3.interpolateCividis, d3.interpolatePlasma, d3.interpolateMagma, d3.interpolateInferno, d3.interpolateViridis, d3.interpolateTurbo, d3.interpolatePurples, d3.interpolateReds, d3.interpolateOranges, d3.interpolateGreys, d3.interpolateGreens, d3.interpolateBlues, d3.interpolateSpectral, d3.interpolateRdYlBu, d3.interpolateRdBu, d3.interpolatePuOr, d3.interpolatePiYG, d3.interpolatePRGn];
	let curve = [], progress = 0, default_camera_speed = .005, camera_speed = default_camera_speed, curve_index = 0, clock, dt, curveObject, catmullRomCurve;
	let cameraFocalPoint = new THREE.Vector3(0, 0, 0), origin = new THREE.Vector3(0, 0, 0), particles, particleCount = 60000, particleSpread = 500, positions, trajectory_iteration_count = 40, trajectoryReverse = false;
	
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
			clock = new THREE.Clock(); clock.start();
			this.addStars();
			this.addCluster();
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
				vertices.push(THREE.MathUtils.randFloatSpread(4000)); vertices.push(THREE.MathUtils.randFloatSpread(4000)); vertices.push(THREE.MathUtils.randFloatSpread(4000));
			}
			
			let size = 1;
			if (utils.iOS() == true) size = settings.iOS.starSize;
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			let stars = new THREE.Points(geometry, new THREE.PointsMaterial({ 
				color: 0x888888,
				size: size
			}));
			scene.add(stars);
		},
		
		addCluster: function() {
			
			clusterGeometry = new THREE.BufferGeometry();
			let vertices = [];
			for (let i = 0; i < particleCount; i += 3) {
				let min = -1000;
				let max =  1000;
				let spread = Math.random() * (max - min) + min;
				vertices.push(THREE.MathUtils.randFloatSpread(spread)); vertices.push(THREE.MathUtils.randFloatSpread(spread)); vertices.push(THREE.MathUtils.randFloatSpread(spread));
			}
			// set colors and positions
			clusterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			let colors = this.interpolateD3Colors(clusterGeometry, interps[5], false);
			clusterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
			
			let size = 1;
			if (utils.iOS() == true) size = settings.iOS.particleSize;
			particles = new THREE.Points(clusterGeometry, new THREE.PointsMaterial({
				vertexColors: THREE.VertexColors,
				size: size
			}));
			scene.add(particles);
		},
		
		updateParticles: function() {
			if (clusterGeometry) {
				
				let pos = particles.geometry.attributes.position.array;
				
				for (let i = 0; i < particleCount; i+=3) {
					
					let position = new THREE.Vector3(pos[i + 0], pos[i + 1], pos[i + 2]);
					
					// define vector field
					let scalar = .01;
					let forceX = -position.y * scalar;
					let forceY = -position.z * scalar;
					let forceZ = -position.x * scalar; // galaxy
					let force =  new THREE.Vector3(forceX, forceY, forceZ);
					
					let min = -500;
					let max = 4000;
					let maxDistance = 1000 + (Math.random() * (max - min) + min);
					if (position.distanceTo(origin) > maxDistance) pos[i] = THREE.MathUtils.randFloatSpread(1000), pos[i + 1] = THREE.MathUtils.randFloatSpread(1000), pos[i + 2] = THREE.MathUtils.randFloatSpread(1000);
					
					pos[i + 0] += forceX;
					pos[i + 1] += forceY;
					pos[i + 2] += forceZ;
				}
				particles.geometry.attributes.position.needsUpdate = true;
			}
		},
		
		interpolateD3Colors: function(geometry, interpolatorFunc, reverse) {
			
			reverse = reverse || false;
			let colors = [];
			
			for (let i = 0; i < particleCount; i += 3) {
				let interpolator = (i/(particleCount - 1));
				let color = this.rgbStringToColor(interpolatorFunc(interpolator));

				colors.push(color.r); colors.push(color.g); colors.push(color.b);
			}
			if (reverse === true) colors.reverse();
			return colors;
		},
		
		rgbStringToColor: function(rgbString) {
			rgbString = rgbString.replace('rgb(','').replace(')','').replace(' ','').split(',');
			return new THREE.Color(rgbString[0]/255, rgbString[1]/255, rgbString[2]/255);
		}
	}
}