#monofuel
#11-2015
'use strict'

#Wrapper around Threejs for camera and lighting settings
#uses canvas with id 'threePanel'

#---------------------------------------------------------------------
#Display
class Display
  constructor: () ->
    @scene = new THREE.Scene()
    @camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000)
    #@camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, - 500, 1000 );
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



    @camera.position.set(0,20,30)
    @camera.up = new THREE.Vector3(0,0,1)
    @camera.rotation.set(-0.6,0,0)
    @camera.rotation.order = 'YXZ';

    @camera.updateProjectionMatrix()
    console.log('threejs ready')


  resize: () ->
    #console.log('resizing to ' + window.innerWidth + ":" + window.innerHeight)
    @camera.aspect = window.innerWidth / window.innerHeight
    @camera.updateProjectionMatrix()
    @renderer.setSize(window.innerWidth, window.innerHeight)

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
