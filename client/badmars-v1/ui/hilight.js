/* @flow */
'use strict';

// monofuel
// 2-7-2016


import {
	PlanetLoc
} from '../map/planetLoc.js';
import {
	buttonMode,
  MODE_FOCUS,
  setMouseActions,
  map,
  display
} from '../client.js';

export class Hilight {
  enabled: boolean;
  location: Array<number>;
  hilightPlane: THREE.Mesh;
  color: number;

  constructor() {
    this.enabled = false;
    this.setGoodColor();
  }

  setGoodColor() {
    this.color = 0x7FFF00;
  }

  setBadColor() {
    this.color = 0xDC143;
  }

  update() {
    if (buttonMode == MODE_FOCUS && !this.enabled) {
      this.enabled = true;
      var thisHilight = this;

      setMouseActions(null,(event) => {
        var mouse = new THREE.Vector2();
        mouse.x = (event.clientX / display.renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -(event.clientY / display.renderer.domElement.clientHeight) * 2 + 1
        var selectedTile = map.getTileAtRay(mouse);
        var newLoc = [selectedTile.x,selectedTile.y];
        if (!thisHilight.location || location.length != 2 || newLoc[0] != thisHilight.location[0] || newLoc[1] != thisHilight.location[1]) {
          thisHilight.location = newLoc;

          var geometry = new THREE.Geometry();
          geometry.vertices.push(new THREE.Vector3(0,0,selectedTile.corners[0]));
          geometry.vertices.push(new THREE.Vector3(1,0,selectedTile.corners[2]));
          geometry.vertices.push(new THREE.Vector3(0,1,selectedTile.corners[1]));
          geometry.vertices.push(new THREE.Vector3(1,1,selectedTile.corners[3]));
          var material = new THREE.MeshBasicMaterial({color: thisHilight.color, side: THREE.DoubleSide});
          if (thisHilight.hilightPlane) {
            display.removeMesh(thisHilight.hilightPlane);
          }
          thisHilight.hilightPlane = new THREE.Mesh(geometry,material);
          thisHilight.hilightPlane.position.x = thisHilight.location[0];
          thisHilight.hilightPlane.position.z = - thisHilight.location[1];
          thisHilight.hilightPlane.position.y = 0.2;
          thisHilight.hilightPlane.rotation.x = - Math.PI / 2;
          display.addMesh(thisHilight.hilightPlane);
        }
      });
    }

    if (!this.enabled) {
      if (this.hilightPlane) {
        display.removeMesh(this.hilightPlane);
        this.hilightPlane = null;
      }
    }
  }
}
