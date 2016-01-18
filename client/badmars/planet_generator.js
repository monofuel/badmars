'use strict';
var Datgui, StatMonitor, bMode, builderClick, buttonMode, cameraSpeed, clearButtons, clock, datgui, deleteWorld, delta, display, getWorldList, handleInput, keysDown, logicLoop, map, newWorld, saveWorld, selectWorld, selectedUnit, statsMonitor, storageClick, tankClick, transportClick, updateMap;

bMode = {
  selection: 0,
  move: 1,
  storage: 2,
  tank: 3,
  builder: 4,
  transport: 5
};

display = null;

map = null;

datgui = null;

delta = 0;

clock = null;

statsMonitor = null;

buttonMode = bMode.selection;

keysDown = [];

selectedUnit = null;

cameraSpeed = 30;

window.onresize = function() {
  if (display) {
    return display.resize();
  }
};

window.onload = function() {
  var get3DMousePos;
  display = new Display();
  map = new Map();
  map.populateResources();
  map.addToRender();
  datgui = new Datgui();
  statsMonitor = new StatMonitor();
  clock = new THREE.Clock();
  requestAnimationFrame(logicLoop);
  getWorldList();
  document.body.onkeydown = function(key) {
    var inputBox;
    inputBox = document.getElementById('worldName');
    if (document.activeElement === inputBox) {
      return;
    }
    if (keysDown.indexOf(key.keyCode) === -1 && key.keyCode !== 18) {
      return keysDown.push(key.keyCode);
    }
  };
  document.body.onkeyup = function(key) {
    var index, inputBox;
    inputBox = document.getElementById('worldName');
    if (document.activeElement === inputBox) {
      return;
    }
    index = keysDown.indexOf(key.keyCode);
    if (index !== -1) {
      return keysDown.splice(index, 1);
    }
  };
  document.body.oncontextmenu = function() {
    return false;
  };
  get3DMousePos = function(mouseEvent) {
    var mouse;
    mouse = new THREE.Vector2();
    mouse.x = (mouseEvent.clientX / display.renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(mouseEvent.clientY / display.renderer.domElement.clientHeight) * 2 + 1;
    return map.getRayPosition(mouse);
  };
  document.body.onmousemove = function(event) {
    var j, k, pos, tile, tiles, valid, vec, _i, _j, _k, _len;
    switch (buttonMode) {
      case bMode.storage:
        pos = get3DMousePos(event);
        tiles = [];
        for (j = _i = 0; _i <= 2; j = ++_i) {
          for (k = _j = 0; _j <= 2; k = ++_j) {
            vec = new THREE.Vector3();
            vec.copy(pos);
            vec.x += j - 1;
            vec.z += k - 1;
            tile = map.getLoc(vec);
            tiles.push(tile);
          }
        }
        valid = true;
        for (_k = 0, _len = tiles.length; _k < _len; _k++) {
          tile = tiles[_k];
          if (tile.type !== tileType.land) {
            valid = false;
          }
        }
        this.tile = map.getLoc(pos);
        if (valid) {
          return map.hilight(0x7FFF00, this.tile.x, this.tile.y);
        } else {
          return map.hilight(0xDC143C, this.tile.x, this.tile.y);
        }
        break;
      case bMode.builder:
        pos = get3DMousePos(event);
        this.tile = map.getLoc(pos);
        if (this.tile.type === tileType.land) {
          return map.hilight(0x7FFF00, this.tile.x, this.tile.y);
        } else {
          return map.hilight(0xDC143C, this.tile.x, this.tile.y);
        }
        break;
      case bMode.transport:
        pos = get3DMousePos(event);
        this.tile = map.getLoc(pos);
        if (this.tile.type === tileType.land) {
          return map.hilight(0x7FFF00, this.tile.x, this.tile.y);
        } else {
          return map.hilight(0xDC143C, this.tile.x, this.tile.y);
        }
        break;
      case bMode.tank:
        pos = get3DMousePos(event);
        this.tile = map.getLoc(pos);
        if (this.tile.type === tileType.land) {
          return map.hilight(0x7FFF00, this.tile.x, this.tile.y);
        } else {
          return map.hilight(0xDC143C, this.tile.x, this.tile.y);
        }
    }
  };
  document.body.onmousedown = function(event) {};
  return document.body.onmouseup = function(event) {
    var mouse, pos, unit;
    event.preventDefault();
    mouse = new THREE.Vector2();
    mouse.x = (event.clientX / display.renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / display.renderer.domElement.clientHeight) * 2 + 1;
    pos = map.getRayPosition(mouse);
    this.tile = map.getLoc(pos);
    switch (event.button) {
      case 0:
        switch (buttonMode) {
          case bMode.selection:
            console.log('button selection');
            unit = getSelectedUnit(mouse);
            if (unit) {
              console.log(unit.type + " clicked");
              this.tile = map.getLoc(pos);
              selectedUnit = unit;
              return buttonMode = bMode.move;
            }
            break;
          case bMode.move:
            unit = getSelectedUnit(mouse);
            if (unit) {
              console.log(unit.type + " clicked");
              this.tile = map.getLoc(pos);
              selectedUnit = unit;
              return buttonMode = bMode.move;
            } else {
              buttonMode = bMode.selection;
              clearButtons();
              selectedUnit = null;
              return map.clearHilight();
            }
            break;
          case bMode.storage:
            console.log('storage placement');
            buttonMode = bMode.selection;
            clearButtons();
            new storage(this.tile);
            return map.clearHilight();
          case bMode.builder:
            console.log('builder placement');
            buttonMode = bMode.selection;
            clearButtons();
            new builder(this.tile);
            return map.clearHilight();
          case bMode.transport:
            console.log('transport placement');
            buttonMode = bMode.selection;
            clearButtons();
            new transport(this.tile);
            return map.clearHilight();
          case bMode.tank:
            console.log('tank placement');
            buttonMode = bMode.selection;
            clearButtons();
            new tank(this.tile);
            return map.clearHilight();
        }
        break;
      case 1:
        return console.log('middle click');
      case 2:
        switch (buttonMode) {
          case bMode.move:
            console.log('move ordered');
            return selectedUnit.updatePath(this.tile);
          default:
            buttonMode = bMode.selection;
            clearButtons();
            selectedUnit = null;
            return map.clearHilight();
        }
    }
  };
};

storageClick = function() {
  var button;
  buttonMode = bMode.storage;
  button = document.getElementById('storageButton');
  clearButtons();
  return button.className = "btn btn-warning";
};

tankClick = function() {
  var button;
  buttonMode = bMode.tank;
  button = document.getElementById('tankButton');
  clearButtons();
  return button.className = "btn btn-warning";
};

transportClick = function() {
  var button;
  buttonMode = bMode.transport;
  button = document.getElementById('transportButton');
  clearButtons();
  return button.className = "btn btn-warning";
};

builderClick = function() {
  var button;
  buttonMode = bMode.builder;
  button = document.getElementById('builderButton');
  clearButtons();
  return button.className = "btn btn-warning";
};

clearButtons = function() {
  var button;
  button = document.getElementById('storageButton');
  button.className = "btn btn-primary";
  button = document.getElementById('tankButton');
  button.className = "btn btn-primary";
  button = document.getElementById('builderButton');
  button.className = "btn btn-primary";
  button = document.getElementById('transportButton');
  return button.className = "btn btn-primary";
};

saveWorld = function() {
  var newWorld, xhttp;
  newWorld = {
    name: document.getElementById('worldName').value,
    vertex_grid: map.grid,
    movement_grid: map.navGrid,
    settings: map.settings
  };
  console.log('saving world: ', newWorld.name);
  xhttp = new XMLHttpRequest();
  xhttp.open('POST', 'worlds', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState === 4) {
      if (xhttp.status === 200) {
        alert('world saved!');
        return getWorldList();
      } else {
        return alert('failed to save world');
      }
    }
  };
  return xhttp.send(JSON.stringify(newWorld));
};

deleteWorld = function() {
  var name, xhttp;
  xhttp = new XMLHttpRequest();
  name = document.getElementById('worldName').value;
  xhttp.open('DELETE', 'worlds?name=' + name, true);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState === 4) {
      if (xhttp.status === 200) {
        alert('world deleted!');
        return getWorldList();
      } else {
        return alert('failed to delete world');
      }
    }
  };
  return xhttp.send();
};

newWorld = function() {
  return updateMap();
};

selectWorld = function(world) {
  var xhttp;
  console.log('selecting world ' + world);
  xhttp = new XMLHttpRequest();
  xhttp.open("GET", "worlds?name=" + world, true);
  xhttp.onreadystatechange = function() {
    var response, settings, unit;
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      console.log('recieved world: ' + world);
      response = JSON.parse(xhttp.responseText);
      settings = {
        name: response.name,
        size: response.vertex_grid.length - 1,
        water: response.settings.water,
        waterHeight: response.settings.waterHeight,
        chunkSize: response.settings.chunkSize,
        cliffDelta: response.settings.cliffDelta
      };
      document.getElementById('worldName').value = settings.name;
      map.removeFromRender();
      while (units.length > 0) {
        unit = units[0];
        if (unit && unit.destroy) {
          unit.destroy();
        } else {
          console.log('invalid unit in units list');
          console.log(unit);
          break;
        }
      }
      map = new Map(settings, response.vertex_grid, response.movement_grid);
      return map.addToRender();
    }
  };
  return xhttp.send();
};

getWorldList = function() {
  var xhttp;
  xhttp = new XMLHttpRequest();
  xhttp.open("GET", "worlds", true);
  xhttp.onreadystatechange = function() {
    var menu, response, world, _i, _len, _ref, _results;
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      response = JSON.parse(xhttp.responseText);
      menu = document.getElementById("worldMenu");
      menu.innerHTML = "";
      _ref = response.worlds;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        world = _ref[_i];
        _results.push(menu.innerHTML += '<li><a onclick="selectWorld(\'' + world + '\')" >' + world + '</a></li>');
      }
      return _results;
    }
  };
  return xhttp.send();
};

logicLoop = function() {
  var unit, _i, _len;
  requestAnimationFrame(logicLoop);
  statsMonitor.begin();
  delta = clock.getDelta();
  if (keysDown.length > 0) {
    handleInput(delta);
  }
  for (_i = 0, _len = units.length; _i < _len; _i++) {
    unit = units[_i];
    unit.update(delta);
  }
  map.update(delta);
  display.render(delta);
  return statsMonitor.end();
};

handleInput = function(delta) {
  var key, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = keysDown.length; _i < _len; _i++) {
    key = keysDown[_i];
    switch (key) {
      case 87:
        display.camera.translateZ(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta);
        _results.push(display.camera.translateY(Math.sin(display.camera.rotation.x + Math.PI) * cameraSpeed * delta));
        break;
      case 65:
        _results.push(display.camera.translateX(Math.cos(display.camera.rotation.x + Math.PI) * cameraSpeed * delta));
        break;
      case 83:
        display.camera.translateZ(Math.cos(display.camera.rotation.x) * cameraSpeed * delta);
        _results.push(display.camera.translateY(Math.sin(display.camera.rotation.x) * cameraSpeed * delta));
        break;
      case 68:
        _results.push(display.camera.translateX(Math.cos(display.camera.rotation.x) * cameraSpeed * delta));
        break;
      case 82:
        _results.push(display.cameraUp(delta));
        break;
      case 70:
        _results.push(display.cameraDown(delta));
        break;
      case 81:
        _results.push(display.cameraRotateRight(delta));
        break;
      case 69:
        _results.push(display.cameraRotateLeft(delta));
        break;
      default:
        _results.push(void 0);
    }
  }
  return _results;
};

StatMonitor = (function() {
  function StatMonitor() {
    this.fpsStats = new Stats();
    this.msStats = new Stats();
    this.mbStats = new Stats();
    this.fpsStats.setMode(0);
    this.msStats.setMode(1);
    this.mbStats.setMode(2);
    this.fpsStats.domElement.style.position = 'absolute';
    this.fpsStats.domElement.style.left = '0px';
    this.fpsStats.domElement.style.bottom = '0px';
    this.msStats.domElement.style.position = 'absolute';
    this.msStats.domElement.style.left = '80px';
    this.msStats.domElement.style.bottom = '0px';
    this.mbStats.domElement.style.position = 'absolute';
    this.mbStats.domElement.style.left = '160px';
    this.mbStats.domElement.style.bottom = '0px';
    document.body.appendChild(this.fpsStats.domElement);
    document.body.appendChild(this.msStats.domElement);
    document.body.appendChild(this.mbStats.domElement);
    console.log('stats monitor loaded');
  }

  StatMonitor.prototype.begin = function() {
    this.fpsStats.begin();
    this.msStats.begin();
    return this.mbStats.begin();
  };

  StatMonitor.prototype.end = function() {
    this.fpsStats.end();
    this.msStats.end();
    return this.mbStats.end();
  };

  return StatMonitor;

})();

Datgui = (function() {
  function Datgui() {
    this.gui = new dat.GUI({
      height: 5 * 32 - 1
    });
    this.gui.add(map.settings, 'waterHeight').min(0).max(20).onFinishChange(function() {
      console.log('water is now at ' + map.settings.waterHeight);
      return updateMap();
    });
    this.gui.add(map.settings, 'water').onFinishChange(function() {
      if (map.settings.water) {
        console.log('water is now on');
      } else {
        console.log('water is now off');
      }
      return updateMap();
    });
    this.gui.add(map.settings, 'size').min(34).max(1026).step(16).onFinishChange(function() {
      console.log('map resized to ' + map.settings.size);
      return updateMap();
    });
    this.gui.add(map.settings, 'cliffDelta').min(0).max(5).onFinishChange(updateMap);
    this.gui.add(map.settings, 'bigNoise').min(0).max(1).onFinishChange(updateMap);
    this.gui.add(map.settings, 'bigNoiseScale').min(0).max(5).onFinishChange(updateMap);
    this.gui.add(map.settings, 'medNoise').min(0).max(1).onFinishChange(updateMap);
    this.gui.add(map.settings, 'medNoiseScale').min(0).max(1).onFinishChange(updateMap);
    this.gui.add(map.settings, 'smallNoise').min(0).max(1).onFinishChange(updateMap);
    this.gui.add(map.settings, 'smallNoiseScale').min(0).max(.75).onFinishChange(updateMap);
  }

  return Datgui;

})();

updateMap = function() {
  var unit;
  map.removeFromRender();
  while (units.length > 0) {
    unit = units[0];
    if (unit && unit.destroy) {
      unit.destroy();
    } else {
      console.log('invalid unit in units list');
      console.log(unit);
      break;
    }
  }
  map.generate();
  return map.addToRender();
};
