#monofuel
#11-2015
'use strict'

#Wrapper around Threejs for camera and lighting settings
#uses canvas with id 'threePanel'

orthographic = false

#---------------------------------------------------------------------
#Display
class Display
  constructor: () ->
    @scene = new THREE.Scene()
    aspectRatio =   window.innerWidth / window.innerHeight
    @d = 35
    if (orthographic)
      @camera = new THREE.OrthographicCamera( - @d * aspectRatio, @d * aspectRatio, @d, - @d, 1, 1000 );
    else
      @camera = new THREE.PerspectiveCamera(75,aspectRatio,0.1,1000)
    panel = document.getElementById('threePanel')
    @renderer = new THREE.WebGLRenderer({antialias: true, canvas: panel})
    @renderer.setSize(window.innerWidth, window.innerHeight)
    #document.body.appendChild(@renderer.domElement)

    #light = new THREE.AmbientLight(0x101010)
    #@scene.add(light)

    #directionalLight = new THREE.DirectionalLight(0xffffff,0.5)
    #directionalLight.position.set(0,15,0)
    #@scene.add(directionalLight)

    hemLight = new THREE.HemisphereLight(0xffe5bb, 0xFFBF00, .1);
    @scene.add(hemLight);

    dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.position.set( -1, 0.75, 1 );
    dirLight.position.multiplyScalar( 50);
    dirLight.name = "dirlight";
    #dirLight.shadowCameraVisible = true;
    @light = dirLight
    @scene.add( dirLight );

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


    if (orthographic)
      @camera.position.set(70, 120, 70)
      @camera.up = new THREE.Vector3(0,0,1)
      @camera.rotation.set(-0.8,Math.PI/4,0)
      @camera.rotation.order = 'YXZ';
    else
      @camera.position.set(0,20,30)
      @camera.up = new THREE.Vector3(0,0,1)
      @camera.rotation.set(-0.6,0,0)
      @camera.rotation.order = 'YXZ';

    @camera.updateProjectionMatrix()
    console.log('threejs ready')


  resize: () ->
    #console.log('resizing to ' + window.innerWidth + ":" + window.innerHeight)
    aspectRatio =   window.innerWidth / window.innerHeight
    if (orthographic)
      @camera.left = - @d * aspectRatio
      @camera.right = @d * aspectRatio
      @camera.top = @d
      @camera.bottom = -@d
      @camera.updateProjectionMatrix();

    else
      @camera.aspect = aspectRatio
      @camera.updateProjectionMatrix()

    @renderer.setSize(window.innerWidth, window.innerHeight)

  cameraUp: (delta) ->
    if (orthographic)
      @d *= 1 - (1 * delta)
      @resize()
    else
      display.camera.position.y += cameraSpeed * delta

  cameraDown: (delta) ->
    if (orthographic)
      @d *= 1 + (1 * delta)
      @resize()
    else
      display.camera.position.y -= cameraSpeed * delta

  render: () ->
    @renderer.render(@scene,@camera)

  lookAt: (mesh) ->
    @camera.up = new THREE.Vector3(0,0,-1)
    @camera.lookAt(mesh.position)
    @camera.updateProjectionMatrix()

  addMesh: (mesh) ->
    @scene.add(mesh)
  removeMesh: (mesh) ->
    @scene.remove(mesh)
