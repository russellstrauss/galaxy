const { Vector3 } = require("three");

(function () {

	var appSettings;
	var scene;
	
	window.gfx = (function() {
		
		return {

			appSettings: {
				activateLightHelpers: false,
				axesHelper: {
					active: false,
					axisLength: 50,
					axes: null,
					labels: []
				},
				font: {
					enable: true,
					smallFont: {
						font: null,
						size: 1.5,
						height: 0,
						curveSegments: 1
					},
					largeFont: {
						font: null,
						size: 3,
						height: 0,
						curveSegments: 1
					}
				},
				zBuffer: .1,
				errorLogging: false
			},

			activateAxesHelper: function() {
				let self = this;
				gfx.appSettings.axesHelper.axes = new THREE.AxesHelper(gfx.appSettings.axesHelper.axisLength);
				scene.add(gfx.appSettings.axesHelper.axes);
				self.labelAxesHelper();
			},
			
			toggleAxesHelper: function() {
				let self = this;
				if (gfx.appSettings.axesHelper.active) {
					scene.remove(gfx.appSettings.axesHelper.axes);
					gfx.appSettings.axesHelper.labels.forEach(function(label) {
						scene.remove(label);
					});
				}
				else {
					self.activateAxesHelper();
				}
				gfx.appSettings.axesHelper.active = !gfx.appSettings.axesHelper.active;
			},

			activateLightHelpers: function(lights) {

				for (let i = 0; i < lights.length; i++) {
					let helper = new THREE.DirectionalLightHelper(lights[i], 5, 0x00000);
					scene.add(helper);
				}
			},
			
			meshSetPosition: function(mesh, position) {
				mesh.position.set(position.x, position.y, position.z);
			},

			createVector: function(pt1, pt2) {
				return new THREE.Vector3(pt2.x - pt1.x, pt2.y - pt1.y, pt2.z - pt1.z);
			},
			
			addVectors(vector1, vector2, vector3) {
				vector3 = vector3 || new THREE.Vector3(0, 0, 0);
				return new THREE.Vector3(vector1.x + vector2.x + vector3.x, vector1.y + vector2.y + vector3.y, vector1.z + vector2.z + vector3.z);	
			},
			
			sortVerticesClockwise: function(geometry) {
			
				let self = this;
				let midpoint = new THREE.Vector3(0, 0, 0);
				geometry.vertices.forEach(function(vertex) {
					midpoint.x += vertex.x - .001; // very slight offset for the case where polygon is a quadrilateral so that not all angles are equal
					midpoint.y += vertex.y;
					midpoint.z += vertex.z - .001;
				});
				
				midpoint.x /= geometry.vertices.length;
				midpoint.y /= geometry.vertices.length;
				midpoint.z /= geometry.vertices.length;
				
				let sorted = geometry.clone();
				sorted.vertices.forEach(function(vertex) {
					
					let vec = gfx.createVector(midpoint, vertex);
					let vecNext = gfx.createVector(midpoint, utils.next(sorted.vertices, vertex));
					let angle = gfx.getAngleBetweenVectors(vec, vecNext);
					vertex.angle = angle;
				});
				
				sorted.vertices.sort((a, b) => a.angle - b.angle);
				
				return sorted;
			},
			
			createLine: function(pt1, pt2) {
				let geometry = new THREE.Geometry();
				geometry.vertices.push(pt1);
				geometry.vertices.push(pt2);
				return geometry;
			},
			
			intersection: function(line1, line2) {
			
				let pt1 = line1.vertices[0]; let pt2 = line1.vertices[1];
				let pt3 = line2.vertices[0]; let pt4 = line2.vertices[1];
				let lerpLine1 = ((pt4.x - pt3.x) * (pt1.z - pt3.z) - (pt4.z - pt3.z) * (pt1.x - pt3.x)) / ((pt4.z - pt3.z) * (pt2.x - pt1.x) - (pt4.x - pt3.x) * (pt2.z - pt1.z));
				let lerpLine2 = ((pt2.x - pt1.x) * (pt1.z - pt3.z) - (pt2.z - pt1.z) * (pt1.x - pt3.x)) / ((pt4.z - pt3.z) * (pt2.x - pt1.x) - (pt4.x - pt3.x) * (pt2.z - pt1.z));
				
				let x = pt1.x + lerpLine1 * (pt2.x - pt1.x);
				let z = pt1.z + lerpLine1 * (pt2.z - pt1.z);
				return new THREE.Vector3(x, 0, z);
			},
			
			getMagnitude: function(vector) {
				let magnitude = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2));
				return magnitude;
			},

			getMidpoint: function(pt1, pt2) {
			
				let midpoint = new THREE.Vector3();
				midpoint.x = (pt1.x + pt2.x) / 2;
				midpoint.y = (pt1.y + pt2.y) / 2;
				midpoint.z = (pt1.z + pt2.z) / 2;
				return midpoint;
			},
			
			isRightTurn: function(startingPoint, turningPoint, endingPoint) { // This might only work if vectors are flat on the ground since I am using y-component to determine sign

				let segment1 = gfx.createVector(startingPoint, turningPoint);
				let segment2 = gfx.createVector(turningPoint, endingPoint);
	
				let result = new THREE.Vector3();
				result.crossVectors(segment1, segment2);
	
				return result.y > 0;
			},

			setUpScene: function() {

				scene = new THREE.Scene();
				scene.background = new THREE.Color(0xf0f0f0);
	
				if (gfx.appSettings.axesHelper.active) {
	
					gfx.activateAxesHelper();
				}
				return scene;
			},

			setUpRenderer: function(renderer) {
				renderer = new THREE.WebGLRenderer();
				renderer.setSize(window.innerWidth, window.innerHeight);
				document.body.appendChild(renderer.domElement);
				return renderer;
			},

			setUpCamera: function(camera) {
				camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
				return camera;
			},

			showPoints: function(geometry, color, opacity) {
			
				for (let i = 0; i < geometry.vertices.length; i++) {
					gfx.showPoint(geometry.vertices[i], color, opacity);
				}
			},

			showPoint: function(pt, color, size, opacity) {
				color = color || 0xff0000;
				opacity = opacity || 1;
				size = size || 5;
				let dotGeometry = new THREE.Geometry();
				dotGeometry.vertices.push(pt);
				let dotMaterial = new THREE.PointsMaterial({ 
					size: size,
					sizeAttenuation: false,
					color: color,
					opacity: opacity,
					transparent: true
				});
				let dot = new THREE.Points(dotGeometry, dotMaterial);
				scene.add(dot);
				
				return pt;
			},

			showVector: function(vector, origin, color) {
				let arrowHelper;
				if (vector.length() > 0) {
					color = color || 0xff0000;
					arrowHelper = new THREE.ArrowHelper(vector, origin, vector.length(), color);
					scene.add(arrowHelper);
				}
				else {
					gfx.showPoint(origin, color);
				}
				return arrowHelper;
			},
			
			updateArrow: function(arrow, origin, newDirection) {
				let direction = gfx.createVector(origin, newDirection);
				arrow.setDirection(direction);
				arrow.setLength(direction.length()); // Why?
				return arrow;
			},

			/* 	Inputs: pt - point in space to label, in the form of object with x, y, and z properties; label - text content for label; color - optional */
			labelPoint: function(pt, label, color, rotation) {
				rotation = rotation || new THREE.Vector3(0, 0, 0);
				let self = this;
				if (gfx.appSettings.font.enable) {
					color = color || 0xff0000;
					let textGeometry = new THREE.TextGeometry(label, self.appSettings.font.smallFont);
					let textMaterial = new THREE.MeshBasicMaterial({ color: color });
					let mesh = new THREE.Mesh(textGeometry, textMaterial);
					textGeometry.rotateX(rotation.x); textGeometry.rotateY(rotation.y); textGeometry.rotateZ(rotation.z);
					textGeometry.translate(pt.x, pt.y, pt.z);
					scene.add(mesh);
					return mesh;
				}
			},
			
			labelLarge: function(pt, label, color, rotation) {
				rotation = rotation || new THREE.Vector3(0, 0, 0);
				let self = this;
				if (gfx.appSettings.font.enable) {
					color = color || 0xff0000;
					let textGeometry = new THREE.TextGeometry(label, self.appSettings.font.largeFont);
					let textMaterial = new THREE.MeshBasicMaterial({ color: color });
					let mesh = new THREE.Mesh(textGeometry, textMaterial);
					textGeometry.rotateX(rotation.x); textGeometry.rotateY(rotation.y); textGeometry.rotateZ(rotation.z);
					textGeometry.translate(pt.x, pt.y, pt.z);
					scene.add(mesh);
				}
			},

			drawLine: function(origin, vector, color, alpha) {
				
				color = color || 0xffffff;
				alpha = alpha || 1;
				
				let material = new THREE.LineBasicMaterial({
					color: color,
					opacity: alpha,
					transparent: true
				});
				let geometry = new THREE.Geometry();
				geometry.vertices.push(origin);
				geometry.vertices.push(gfx.movePoint(origin, vector));
				
				let line = new THREE.Line(geometry, material);
				scene.add(line);
				return line;
			},
			
			drawLineFromPoints: function(pt1, pt2, color, alpha) {
				
				color = color || 0x0000ff;
				alpha = alpha || 1;
				
				let material = new THREE.LineBasicMaterial({
					color: color,
					opacity: alpha,
					transparent: true,
					linewidth: 100,
					linecap: 'round', //ignored by WebGLRenderer
					linejoin:  'round' //ignored by WebGLRenderer
				});
				let geometry = new THREE.Geometry();
				geometry.vertices.push(new THREE.Vector3(pt1.x, pt1.y, pt1.z));
				geometry.vertices.push(new THREE.Vector3(pt2.x, pt2.y, pt2.z));
				
				let line = new THREE.Line(geometry, material);
				scene.add(line);
			},

			getDistance: function(pt1, pt2) { // create point class?
			
				let squirt = Math.pow((pt2.x - pt1.x), 2) + Math.pow((pt2.y - pt1.y), 2) + Math.pow((pt2.z - pt1.z), 2);
				return Math.sqrt(squirt);
			},

			labelAxesHelper: function() {
				let self = this;
				if (gfx.appSettings.font.enable) {
					gfx.appSettings.axesHelper.labels = [];
					let textGeometry = new THREE.TextGeometry('Y', gfx.appSettings.font.largeFont);
					let textMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
					let mesh = new THREE.Mesh(textGeometry, textMaterial);
					
					textGeometry.translate(0, gfx.appSettings.axesHelper.axisLength, 0);
					scene.add(mesh);
					gfx.appSettings.axesHelper.labels.push(mesh);
					
					textGeometry = new THREE.TextGeometry('X', gfx.appSettings.font.largeFont);
					textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
					mesh = new THREE.Mesh(textGeometry, textMaterial);
					textGeometry.translate(gfx.appSettings.axesHelper.axisLength, 0, 0);
					scene.add(mesh);
					gfx.appSettings.axesHelper.labels.push(mesh);
					
					textGeometry = new THREE.TextGeometry('Z', gfx.appSettings.font.largeFont);
					textMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
					mesh = new THREE.Mesh(textGeometry, textMaterial);
					textGeometry.translate(0, 0, gfx.appSettings.axesHelper.axisLength);
					scene.add(mesh);
					gfx.appSettings.axesHelper.labels.push(mesh);
				}
			},

			setCameraLocation: function(camera, pt) {
				camera.position.set(pt.x, pt.y, pt.z);
			},

			resizeRendererOnWindowResize: function(renderer, camera) {

				window.addEventListener('resize', utils.debounce(function() {
					
					if (renderer) {
		
						camera.aspect = window.innerWidth / window.innerHeight;
						camera.updateProjectionMatrix();
						renderer.setSize(window.innerWidth, window.innerHeight);
					}
				}, 250));
			},

			resetScene: function(scope) {
			
				scope.settings.stepCount = 0;
				
				for (let i = scene.children.length - 1; i >= 0; i--) {
					let obj = scene.children[i];
					scene.remove(obj);
				}
				
				gfx.addFloor();
				scope.addTetrahedron();
				gfx.setUpLights();
				gfx.setCameraLocation(camera, self.settings.defaultCameraLocation);
			},

			enableControls: function(controls, renderer, camera) {
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.target.set(0, 0, 0);
				controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
				controls.dampingFactor = 0.05;
				controls.zoomSpeed = 2;
				controls.enablePan = !utils.mobile();
				controls.panSpeed = 1.5;
				controls.minDistance = 0;
				controls.maxDistance = 3000;
				controls.maxPolarAngle = Math.PI / 2;
				return controls;
			},

			enableStats: function(stats) {
				document.body.appendChild(stats.dom);
			},

			setUpLights: function() {

				let self = this;
				let lights = [];
				const color = 0xFFFFFF;
				const intensity = 1;
				const light = new THREE.DirectionalLight(color, intensity);
				light.position.set(-1, 2, 4);
				scene.add(light);
				lights.push(light);
	
				const light2 = new THREE.DirectionalLight(color, intensity);
				light2.position.set(0, 2, -8);
				scene.add(light2);
				lights.push(light2)
				
				if (gfx.appSettings.activateLightHelpers) {
					gfx.activateLightHelpers(lights);
				}
			},
			
			movePoint: function(pt, vec) {
				return new THREE.Vector3(pt.x + vec.x, pt.y + vec.y, pt.z + vec.z);
			},

			createTriangle: function(pt1, pt2, pt3) { // return geometry
				let triangleGeometry = new THREE.Geometry();
				triangleGeometry.vertices.push(new THREE.Vector3(pt1.x, pt1.y, pt1.z));
				triangleGeometry.vertices.push(new THREE.Vector3(pt2.x, pt2.y, pt2.z));
				triangleGeometry.vertices.push(new THREE.Vector3(pt3.x, pt3.y, pt3.z));
				triangleGeometry.faces.push(new THREE.Face3(0, 1, 2));
				triangleGeometry.computeFaceNormals();
				return triangleGeometry;
			},
			
			getCentroid: function(geometry) { 
			
				let result = new THREE.Vector3();
				let x = 0, y = 0, z = 0;
				
				for (let i = 0; i < geometry.vertices.length; i++) {
					
					x += geometry.vertices[i].x;
					y += geometry.vertices[i].y;
					z += geometry.vertices[i].z;
				}
				
				result.x = x / 3;
				result.y = y / 3;
				result.z = z / 3;
				return result;
			},
			
			pointInFace: function(pt, face) {
				
				let geometry = new THREE.Geometry();
				let vertices = [face.a, face.b, face.c];
				let angleSum = 0;
				vertices.forEach(function(vertex) {
					geometry.vertices.push(vertex);
				});
				
				for (let i = 0; i < vertices.length; i++) {
					angleSum += gfx.calculateAngle(geometry.vertices[i], pt, gfx.nextVertex(geometry.vertices[i], geometry));
				}
				
				return angleSum === Math.PI * 2;
			},
			
			nextVertex: function(currentVertex, geometry) {
			
				let vertexIndex = geometry.vertices.findIndex(function(element) {
					return element === currentVertex;
				});
				return geometry.vertices[(vertexIndex + 1) % geometry.vertices.length];
			},

			getAngleBetweenVectors: function(vector1, vector2) {

				let dot = vector1.dot(vector2);
				let length1 = vector1.length();
				let length2 = vector2.length();			
				return Math.acos(dot / (length1 * length2));
			},
			
			calculateAngle(endpoint1, vertex, endpoint2) {

				let vector1 = new THREE.Vector3(endpoint1.x - vertex.x, endpoint1.y - vertex.y, endpoint1.z - vertex.z);
				let vector2 = new THREE.Vector3(endpoint2.x - vertex.x, endpoint2.y - vertex.y, endpoint2.z - vertex.z);
				return vector1.angleTo(vector2);
			},
			
			intersects: function(event, camera, targetList) {
				// targetList = [mesh_1, mesh_2, ...];
				var raycaster = new THREE.Raycaster();
				raycaster.setFromCamera(window.russells_magical_mouse, camera);
				var intersects = raycaster.intersectObjects(targetList);
				
				if (intersects.length > 0) {
					return intersects;
				}
				else {
					return null;
				}
			}
		}
	})();
	
	module.exports = window.gfx;
})();