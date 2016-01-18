'use strict';
var Map, Noise, PlanetLoc, getTypeName, tileType;

tileType = {
  land: 0,
  cliff: 1,
  water: 2,
  coast: 3
};

getTypeName = function(type) {
  switch (tileType) {
    case tileType.land:
      return 'land';
    case tileType.cliff:
      return 'cliff';
    case tileType.water:
      return 'water';
    case tileType.coast:
      return 'coast';
    default:
      return 'unknown';
  }
};

PlanetLoc = (function() {
  function PlanetLoc(planet, x, y) {
    var corners;
    this.planet = planet;
    this.x = x;
    this.y = y;
    if (!this.planet || !this.planet.grid) {
      console.log(this.toString());
      console.log('invalid call to PlanetLoc');
      console.log(new Error().stack);
    }
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    if (this.x < 0) {
      this.x = (this.planet.settings.size + this.x - 1) % (this.planet.settings.size - 1);
    }
    if (this.x >= this.planet.settings.size - 1) {
      this.x = this.x % (this.planet.settings.size - 2);
    }
    if (this.y < 0) {
      this.y = (this.planet.settings.size + this.y - 1) % (this.planet.settings.size - 1);
    }
    if (this.y >= this.planet.settings.size - 1) {
      this.y = this.y % (this.planet.settings.size - 2);
    }
    if (this.x >= this.planet.grid[0].length - 1 || this.x < 0) {
      console.log(this.toString());
      console.log(new Error().stack);
    }
    if (this.y >= this.planet.grid.length - 1 || this.y < 0) {
      console.log(this.toString());
      console.log(new Error().stack);
    }
    corners = [this.planet.grid[this.y][this.x], this.planet.grid[this.y + 1][this.x], this.planet.grid[this.y][this.x + 1], this.planet.grid[this.y + 1][this.x + 1]];
    this.avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
    if (this.avg < this.planet.settings.waterHeight) {
      this.avg = this.planet.settings.waterHeight;
    }
    this.type = this.planet.navGrid[this.x][this.y];
    this.real_x = this.x + 0.5;
    this.real_y = -(this.y + 0.5);
  }

  PlanetLoc.prototype.getLoc = function() {
    return new THREE.Vector3(this.real_x, this.avg, this.real_y);
  };

  PlanetLoc.prototype.toString = function() {
    return "x: " + this.x + ", y: " + this.y + ", planet: " + this.planet.settings.name + ", type: " + getTypeName(this.type);
  };

  PlanetLoc.prototype.W = function() {
    return new PlanetLoc(this.planet, this.x - 1, this.y);
  };

  PlanetLoc.prototype.E = function() {
    return new PlanetLoc(this.planet, this.x + 1, this.y);
  };

  PlanetLoc.prototype.S = function() {
    return new PlanetLoc(this.planet, this.x, this.y - 1);
  };

  PlanetLoc.prototype.N = function() {
    return new PlanetLoc(this.planet, this.x, this.y + 1);
  };

  PlanetLoc.prototype.equals = function(otherLoc) {
    return otherLoc.x === this.x && otherLoc.y === this.y && otherLoc.planet === this.planet;
  };

  return PlanetLoc;

})();

Map = (function() {
  Map.prototype.navGrid = null;

  Map.prototype.landMeshes = [];

  Map.prototype.waterMeshes = [];

  Map.prototype.hilightList = [];

  function Map(settings, grid, navGrid) {
    this.settings = settings;
    this.grid = grid;
    this.navGrid = navGrid;
    if (!this.settings) {
      this.settings = this.defaultSettings;
    }
    if (!this.grid) {
      this.generateWorld();
    }
    if (!this.navGrid) {
      this.generateNav();
    }
    this.generateMesh();
  }

  Map.prototype.generate = function() {
    this.generateWorld();
    this.generateNav();
    this.generateMesh();
    return this.populateResources();
  };

  Map.prototype.generateWorld = function() {
    var point, smoothness, waterFudge, x, y, _i, _j, _ref, _ref1;
    waterFudge = 0.1;
    smoothness = 4.5;
    this.bigNoiseGenerator = new Noise(this.settings.size - 1, this.settings.bigNoise);
    this.medNoiseGenerator = new Noise(this.settings.size - 1, this.settings.medNoise);
    this.smallNoiseGenerator = new Noise(this.settings.size - 1, this.settings.smallNoise);
    this.grid = [];
    for (x = _i = 0, _ref = this.settings.size - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      this.grid[x] = [];
      for (y = _j = 0, _ref1 = this.settings.size - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
        point = this.bigNoiseGenerator.get(x, y) * this.settings.bigNoiseScale;
        point += this.medNoiseGenerator.get(x, y) * this.settings.medNoiseScale;
        point += this.smallNoiseGenerator.get(x, y) * this.settings.smallNoiseScale;
        if (point - this.settings.waterHeight > -waterFudge && point - this.settings.waterHeight < waterFudge) {
          point = this.settings.waterHeight + waterFudge;
        }
        this.grid[x][y] = Math.round(point * smoothness) / smoothness;
      }
    }
    return console.log("Generated World Heightmap");
  };

  Map.prototype.generateNav = function() {
    var x, y, _i, _ref, _results;
    this.navGrid = [];
    _results = [];
    for (x = _i = 0, _ref = this.settings.size - 2; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      this.navGrid[x] = [];
      _results.push((function() {
        var _j, _ref1, _results1;
        _results1 = [];
        for (y = _j = 0, _ref1 = this.settings.size - 2; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
          _results1.push(this.navGrid[x][y] = this.getTileCode(x, y));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  Map.prototype.populateResources = function() {
    var tile, x, y, _i, _j, _k, _ref, _ref1, _ref2, _results;
    console.log('popultating resources');
    for (x = _i = 0, _ref = this.settings.size - 2; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      for (y = _j = 0, _ref1 = this.settings.size - 2; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
        if (Math.random() < this.settings.ironChance) {
          tile = new PlanetLoc(this, x, y);
          new iron(tile);
        }
      }
    }
    _results = [];
    for (x = _k = 0, _ref2 = this.settings.size - 2; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; x = 0 <= _ref2 ? ++_k : --_k) {
      _results.push((function() {
        var _l, _ref3, _results1;
        _results1 = [];
        for (y = _l = 0, _ref3 = this.settings.size - 2; 0 <= _ref3 ? _l <= _ref3 : _l >= _ref3; y = 0 <= _ref3 ? ++_l : --_l) {
          if (Math.random() < this.settings.oilChance) {
            tile = new PlanetLoc(this, x, y);
            _results1.push(new oil(tile));
          } else {
            _results1.push(void 0);
          }
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  Map.prototype.generateMesh = function() {
    var chunkCount, x, y, _i, _ref, _results;
    this.landMeshes = [];
    this.waterMeshes = [];
    chunkCount = (this.settings.size - 2) / this.settings.chunkSize;
    console.log("chunks: " + chunkCount);
    _results = [];
    for (y = _i = 0, _ref = chunkCount - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; y = 0 <= _ref ? ++_i : --_i) {
      _results.push((function() {
        var _j, _ref1, _results1;
        _results1 = [];
        for (x = _j = 0, _ref1 = chunkCount - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; x = 0 <= _ref1 ? ++_j : --_j) {
          _results1.push(this.generateChunk(x, y));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  Map.prototype.generateChunk = function(chunkX, chunkY) {
    var centerMatrix, cliffMaterial, gridGeom, gridMesh, i, index, landFace1, landFace2, landMaterial, landVector1, landVector2, newVec, planetMaterials, waterGeom, waterMaterial, waterMesh, x, y, _i, _j, _k, _l, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4;
    gridGeom = new THREE.Geometry();
    waterGeom = new THREE.PlaneBufferGeometry(this.settings.chunkSize, this.settings.chunkSize);
    landMaterial = new THREE.MeshPhongMaterial({
      color: 0x37DB67
    });
    cliffMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C3A4E
    });
    waterMaterial = new THREE.MeshLambertMaterial({
      color: 0x54958A
    });
    for (y = _i = 0, _ref = this.settings.chunkSize; 0 <= _ref ? _i <= _ref : _i >= _ref; y = 0 <= _ref ? ++_i : --_i) {
      for (x = _j = 0, _ref1 = this.settings.chunkSize; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; x = 0 <= _ref1 ? ++_j : --_j) {
        gridGeom.vertices.push(new THREE.Vector3(x, y, this.grid[(chunkY * this.settings.chunkSize) + y][(chunkX * this.settings.chunkSize) + x]));
      }
    }
    for (y = _k = 0, _ref2 = this.settings.chunkSize - 1; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; y = 0 <= _ref2 ? ++_k : --_k) {
      for (x = _l = 0, _ref3 = this.settings.chunkSize - 1; 0 <= _ref3 ? _l <= _ref3 : _l >= _ref3; x = 0 <= _ref3 ? ++_l : --_l) {
        landFace1 = new THREE.Face3(y * (this.settings.chunkSize + 1) + x, y * (this.settings.chunkSize + 1) + 1 + x, (y + 1) * (this.settings.chunkSize + 1) + x);
        landFace1.materialIndex = 0;
        landFace2 = new THREE.Face3(y * (this.settings.chunkSize + 1) + x + 1, (y + 1) * (this.settings.chunkSize + 1) + x + 1, (y + 1) * (this.settings.chunkSize + 1) + x);
        if (this.navGrid[(chunkX * this.settings.chunkSize) + x][(chunkY * this.settings.chunkSize) + y] !== 1) {
          landFace1.materialIndex = 0;
          landFace2.materialIndex = 0;
        } else {
          landFace1.materialIndex = 1;
          landFace2.materialIndex = 1;
        }
        gridGeom.faces.push(landFace1);
        gridGeom.faces.push(landFace2);
      }
    }
    gridGeom.computeBoundingSphere();
    gridGeom.computeFaceNormals();
    gridGeom.computeVertexNormals();
    waterGeom.computeBoundingSphere();
    waterGeom.computeFaceNormals();
    waterGeom.computeVertexNormals();
    for (index = _m = 0, _ref4 = gridGeom.faces.length - 1; _m <= _ref4; index = _m += 2) {
      landVector1 = gridGeom.faces[index].normal;
      landVector2 = gridGeom.faces[index + 1].normal;
      newVec = landVector1.clone();
      newVec.add(landVector2);
      newVec = newVec.divideScalar(2);
      gridGeom.faces[index].normal.copy(newVec);
      gridGeom.faces[index + 1].normal.copy(newVec);
      for (i = _n = 0; _n <= 2; i = ++_n) {
        gridGeom.faces[index].vertexNormals[i].copy(newVec);
        gridGeom.faces[index + 1].vertexNormals[i].copy(newVec);
      }
    }
    gridGeom.normalsNeedUpdate = true;
    planetMaterials = new THREE.MeshFaceMaterial([landMaterial, cliffMaterial]);
    gridMesh = new THREE.Mesh(gridGeom, planetMaterials);
    waterMesh = new THREE.Mesh(waterGeom, waterMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    waterMesh.rotation.x = -Math.PI / 2;
    centerMatrix = new THREE.Matrix4().makeTranslation(chunkX * this.settings.chunkSize, chunkY * this.settings.chunkSize, 0);
    gridMesh.geometry.applyMatrix(centerMatrix);
    waterMesh.geometry.applyMatrix(centerMatrix);
    waterMesh.position.x += this.settings.chunkSize / 2;
    waterMesh.position.y += this.settings.waterHeight;
    waterMesh.position.z -= this.settings.chunkSize / 2;
    this.landMeshes.push(gridMesh);
    this.waterMeshes.push(waterMesh);
    return console.log("Generated Geometry");
  };

  Map.prototype.defaultSettings = {
    name: "unnamed",
    size: 130,
    chunkSize: 16,
    water: true,
    waterHeight: 6.4,
    bigNoise: .07,
    medNoise: .24,
    smallNoise: .53,
    bigNoiseScale: 1.8,
    medNoiseScale: 0.25,
    smallNoiseScale: 0.25,
    cliffDelta: 0.3,
    ironChance: 0.003,
    oilChance: 0.002
  };

  Map.prototype.getRayPosition = function(mouse) {
    var AllPlanetMeshes, intersects, raycaster, vec;
    raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, display.camera);
    AllPlanetMeshes = this.landMeshes.concat(this.waterMeshes);
    intersects = raycaster.intersectObjects(AllPlanetMeshes);
    if (intersects.length > 0) {
      vec = intersects[0].point;
      vec.x = Math.floor(vec.x) + 0.5;
      vec.z = Math.floor(vec.z) + 0.5;
      vec.y = vec.y + 0.5;
      return vec;
    } else {
      return new THREE.Vector3(0, 0, 0);
    }
  };

  Map.prototype.rotate = function(angle) {
    var axis, mesh, _i, _len, _ref, _results;
    axis = new THREE.Vector3(0, 0, 1);
    _ref = this.landMeshes.concat(this.waterMeshes);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      mesh = _ref[_i];
      _results.push(mesh.rotateOnAxis(axis, angle));
    }
    return _results;
  };

  Map.prototype.removeFromRender = function() {
    var mesh, _i, _len, _ref;
    _ref = this.landMeshes.concat(this.waterMeshes);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      mesh = _ref[_i];
      display.removeMesh(mesh);
    }
    return console.log('removed map from scene');
  };

  Map.prototype.addToRender = function() {
    var mesh, _i, _len, _ref;
    _ref = this.landMeshes.concat(this.waterMeshes);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      mesh = _ref[_i];
      display.addMesh(mesh);
    }
    return console.log('added map to scene');
  };

  Map.prototype.hilight = function(color, x, y) {
    var avg, corners, geometry, material, newHilightLoc;
    newHilightLoc = [x, y];
    if (newHilightLoc === this.hilightLoc) {
      return;
    }
    this.hilightLoc = newHilightLoc;
    geometry = new THREE.Geometry();
    corners = [this.grid[y][x], this.grid[y + 1][x], this.grid[y][x + 1], this.grid[y + 1][x + 1]];
    avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
    geometry.vertices.push(new THREE.Vector3(0, 0, corners[0]));
    geometry.vertices.push(new THREE.Vector3(1, 0, corners[2]));
    geometry.vertices.push(new THREE.Vector3(0, 1, corners[1]));
    geometry.vertices.push(new THREE.Vector3(1, 1, corners[3]));
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(1, 2, 3));
    geometry.computeBoundingSphere();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide
    });
    if (this.hilightPlane) {
      display.removeMesh(this.hilightPlane);
    }
    this.hilightPlane = new THREE.Mesh(geometry, material);
    this.hilightPlane.position.x = x;
    this.hilightPlane.position.z = -y;
    this.hilightPlane.position.y = 0.2;
    this.hilightPlane.rotation.x = -Math.PI / 2;
    return display.addMesh(this.hilightPlane);
  };

  Map.prototype.clearHilight = function() {
    if (this.hilight) {
      display.removeMesh(this.hilightPlane);
      this.hilightPlane = null;
      return this.hilightLoc = null;
    }
  };

  Map.prototype.update = function(delta) {};

  Map.prototype.getLoc = function(vec) {
    var x, y;
    x = Math.floor(vec.x);
    y = -Math.ceil(vec.z);
    return new PlanetLoc(this, x, y);
  };

  Map.prototype.getTileCode = function(x, y) {
    var avg, corners, i, underwater, _i, _len;
    corners = [this.grid[y][x], this.grid[y + 1][x], this.grid[y][x + 1], this.grid[y + 1][x + 1]];
    underwater = 0;
    avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
    for (_i = 0, _len = corners.length; _i < _len; _i++) {
      i = corners[_i];
      if (Math.abs(i - avg) > this.settings.cliffDelta) {
        return tileType.cliff;
      }
      if (i < this.settings.waterHeight) {
        underwater++;
      }
    }
    if (underwater === 4) {
      return tileType.water;
    } else if (underwater > 0) {
      return tileType.coast;
    } else {
      return tileType.land;
    }
  };

  return Map;

})();

Noise = (function() {
  function Noise(iSize, fNoiseScale) {
    this.iSize = iSize;
    this.fNoiseScale = fNoiseScale;
    this.SimplexNoise = Simplex(Math);
    if (!this.iSize || this.iSize < 1) {
      this.iSize = 31;
    }
    this.fRds = this.iSize;
    this.fRdsSin = .5 * this.iSize / (2 * Math.PI);
    if (!this.fNoiseScale || this.fNoiseScale < 0) {
      this.fNoiseScale = .3;
    }
  }

  Noise.prototype.get = function(x, y) {
    var a, b, c, fNX, fNY, fRdx, fRdy, fYSin, v;
    fNX = (x + .5) / this.iSize;
    fNY = (y + .5) / this.iSize;
    fRdx = fNX * 2 * Math.PI;
    fRdy = fNY * Math.PI;
    fYSin = Math.sin(fRdy + Math.PI);
    a = this.fRdsSin * Math.sin(fRdx) * fYSin;
    b = this.fRdsSin * Math.cos(fRdx) * fYSin;
    c = this.fRdsSin * Math.cos(fRdy);
    v = this.SimplexNoise.noise(123 + a * this.fNoiseScale, 132 + b * this.fNoiseScale, 312 + c * this.fNoiseScale);
    return v * 5;
  };

  return Noise;

})();
