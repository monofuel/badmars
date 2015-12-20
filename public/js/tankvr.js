'use strict';
window.onload = function() {
  var animate, camera, controls, d, dirLight, effect, hemLight, loader, manager, onKey, params, renderer, scene, tank;
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  controls = new THREE.VRControls(camera);
  effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  manager = new THREE.LoadingManager();
  manager.onProgress = function(item, loaded, total) {
    return console.log(item, loaded, total);
  };
  loader = new THREE.OBJLoader(manager);
  tank = null;
  console.log('loading tank');
  loader.load('models/tank_mockup.obj', function(object) {
    var helper;
    tank = object;
    tank.children[0].material = new THREE.MeshLambertMaterial();
    console.log(tank);
    tank.position.z = -1;
    tank.position.y = -0.1;
    scene.add(tank);
    tank.scale.set(0.3, 0.3, 0.3);
    helper = new THREE.BoundingBoxHelper(tank, 0xff0000);
    return helper.update();
  });
  params = {
    hideButton: false,
    isUndistorted: false
  };
  manager = new WebVRManager(renderer, effect, params);
  hemLight = new THREE.HemisphereLight(0xffe5bb, 0xFFBF00, .1);
  scene.add(hemLight);
  dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-1, 0.75, 1);
  dirLight.position.multiplyScalar(50);
  dirLight.name = "dirlight";
  scene.add(dirLight);
  dirLight.castShadow = true;
  dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;
  d = 300;
  dirLight.shadowCameraLeft = -d;
  dirLight.shadowCameraRight = d;
  dirLight.shadowCameraTop = d;
  dirLight.shadowCameraBottom = -d;
  dirLight.shadowCameraFar = 3500;
  dirLight.shadowBias = -0.0001;
  dirLight.shadowDarkness = 0.35;
  animate = function(timestamp) {
    if (tank) {
      tank.rotation.y += 0.01;
    }
    controls.update();
    manager.render(scene, camera, timestamp);
    return requestAnimationFrame(animate);
  };
  onKey = function(event) {
    if (event.keyCode === 90) {
      return controls.resetSensor();
    }
  };
  window.addEventListener('keydown', onKey, true);
  return animate();
};
