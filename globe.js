// Found on https://codepen.io/ibirist/pen/LpqZGN

// Scene, Camera, Renderer
'use strict';

var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var aspect = window.innerWidth / window.innerHeight;
var camera = new THREE.PerspectiveCamera(45, aspect, .1, 1500);
var cameraRotationSpeed = 0;
var cameraAutoRotation = true;
var cameraRotationController = function cameraRotationController() {
  var orbitControls = new THREE.OrbitControls(camera);
  cameraAutoRotation = false;
  window.removeEventListener('click', cameraRotationController);
};

// Lights
var spotLight = new THREE.SpotLight(0xffffff, 1, 0, 10, 2);

// Texture Loader
var textureLoader = new THREE.TextureLoader();

// Planets
var planetProto = {
  sphere: function sphere(size) {
    var sphere = new THREE.SphereGeometry(size, 32, 32);

    return sphere;
  },
  material: function material(options) {
    var material = new THREE.MeshPhongMaterial();
    if (options) {
      for (var property in options) {
        material[property] = options[property];
      }
    }

    return material;
  },
  texture: function texture(material, property, uri) {
    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = true;
    textureLoader.load(uri, function (texture) {
      material[property] = texture;
      material.needsUpdate = true;
    });
  }
};

var createPlanet = function createPlanet(options) {
  // Create the planet's Surface
  var surfaceGeometry = planetProto.sphere(options.surface.size);
  var surfaceMaterial = planetProto.material(options.surface.material);
  var surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  // Create the planet's Atmosphere
  var atmosphereGeometry = planetProto.sphere(options.surface.size + options.atmosphere.size);
  var atmosphereMaterialDefaults = {
    side: THREE.DoubleSide,
    transparent: true
  };
  var atmosphereMaterialOptions = Object.assign(atmosphereMaterialDefaults, options.atmosphere.material);
  var atmosphereMaterial = planetProto.material(atmosphereMaterialOptions);
  var atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  // Nest the planet's Surface and Atmosphere into a planet object
  var planet = new THREE.Object3D();
  surface.name = 'surface';
  atmosphere.name = 'atmosphere';
  planet.add(surface);
  planet.add(atmosphere);

  // Load the Surface's textures
  for (var textureProperty in options.surface.textures) {
    planetProto.texture(surfaceMaterial, textureProperty, options.surface.textures[textureProperty]);
  }

  // Load the Atmosphere's texture
  for (var textureProperty in options.atmosphere.textures) {
    planetProto.texture(atmosphereMaterial, textureProperty, options.atmosphere.textures[textureProperty]);
  }

  return planet;
};

var earth = createPlanet({
  surface: {
    size: 0.5,
    material: {
      bumpScale: 0.05,
      specular: new THREE.Color('grey'),
      shininess: 10
    },
    textures: {
      map: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthmap1k.jpg',
      bumpMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthbump1k.jpg',
      specularMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthspec1k.jpg'
    }
  },
  atmosphere: {
    size: 0.01,
    material: {
      opacity: 0.8
    },
    textures: {
      map: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthcloudmap.jpg',
      alphaMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthcloudmaptrans.jpg'
    }
  }
});

// Galaxy
var galaxyGeometry = new THREE.SphereGeometry(100, 32, 32);
var galaxyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide
});
var galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);

// Load Galaxy Textures
textureLoader.crossOrigin = true;
textureLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/starfield.png', function (texture) {
  galaxyMaterial.map = texture;
  scene.add(galaxy);
});

// Scene, Camera, Renderer Configuration
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(camera);
scene.add(spotLight);
scene.add(earth);

// Light Configurations
spotLight.position.set(2, 2, 0);

// Mesh Configurations
earth.receiveShadow = true;
earth.castShadow = true;
earth.getObjectByName('surface').geometry.center();

// On window resize, adjust camera aspect ratio and renderer size
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('click', cameraRotationController);

// Main render function
var render = function render() {
  earth.getObjectByName('surface').rotation.y += 1 / 32 * 0.01;
  earth.getObjectByName('atmosphere').rotation.y += 1 / 16 * 0.01;
  if (cameraAutoRotation) {
    cameraRotationSpeed += 0.001;
    camera.position.y = 1;
    camera.position.x = 2 * Math.sin(cameraRotationSpeed);
    camera.position.z = 2 * Math.cos(cameraRotationSpeed);
    camera.lookAt(earth.position);
  }
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};

render();