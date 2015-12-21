'use strict'


window.onload = () ->
  renderer = new THREE.WebGLRenderer({antialias: true})
  renderer.setPixelRatio(window.devicePixelRatio)

  document.body.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight, 0.1, 10000)
  controls = new THREE.VRControls(camera)
  effect = new THREE.VREffect(renderer)
  effect.setSize(window.innerWidth,window.innerHeight)

  manager = new THREE.LoadingManager()
	 manager.onProgress = ( item, loaded, total ) ->
    console.log( item, loaded, total )



  loader = new THREE.OBJLoader( manager )
  tank = null
  console.log('loading tank')
  loader.load(
    'models/tank_mockup.obj',
    (object) ->

      tank = object
      tank.children[0].material = new THREE.MeshLambertMaterial();
      console.log(tank)
      tank.position.z = -1
      tank.position.y = -0.1
      scene.add(tank)

      tank.scale.set(0.3,0.3,0.3)

      helper = new THREE.BoundingBoxHelper(tank,0xff0000)
      helper.update()
      #scene.add(helper)
      #console.log(helper.box.min,helper.box.max)
  )


  # Create a VR manager helper to enter and exit VR mode.
  params = {
    hideButton: false
    isUndistorted: false
  }
  manager = new WebVRManager(renderer, effect, params);

  hemLight = new THREE.HemisphereLight(0xffe5bb, 0xFFBF00, .1);
  scene.add(hemLight);

  dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
  dirLight.position.set( -1, 0.75, 1 );
  dirLight.position.multiplyScalar( 50);
  dirLight.name = "dirlight";
  #dirLight.shadowCameraVisible = true;
  scene.add( dirLight );

  dirLight.castShadow = true;
  dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024*2;

  d = 300;

  dirLight.shadowCameraLeft = -d;
  dirLight.shadowCameraRight = d;
  dirLight.shadowCameraTop = d;
  dirLight.shadowCameraBottom = -d;

  dirLight.shadowCameraFar = 3500;
  dirLight.shadowBias = -0.0001;
  dirLight.shadowDarkness = 0.35;


  animate = (timestamp) ->
    #Apply rotation to tank
    if (tank)
      tank.rotation.y += 0.01;

    # Update VR headset position and apply to camera.
    controls.update();

    # Render the scene through the manager.
    manager.render(scene, camera, timestamp);
    requestAnimationFrame(animate);

  # Reset the position sensor when 'z' pressed.
  onKey = (event) ->
    if (event.keyCode == 90) # z
      controls.resetSensor()


  window.addEventListener('keydown', onKey, true)

  animate()
