import PlanetLoc from '../map/planetLoc'
import GameState from '../state';
import { getMesh } from './unitModels';
import * as THREE from 'three';
import * as _ from 'lodash';
import config from '../config';

export interface GraphicalEntity {
    mesh: THREE.Group
    movementDelta: number
    selectedLoc: PlanetLoc | null;
    selectionMesh: THREE.Mesh[];
    pathMesh: THREE.Line | null;
    pathLoc: PlanetLoc | null;
    prevPath: string[];
    ghosting: boolean;
    transferRangeMesh: THREE.Line | null;
    links: {
        [key: string]: {
            line: THREE.Line;
            loc: PlanetLoc;
        }
    }
}

export interface AudioEntity {

}

export default interface UnitEntity {
    unit: Unit,
    loc: PlanetLoc,
    graphical?: GraphicalEntity,
    audio?: AudioEntity,

}

export function newUnitEntity(unit: Unit): UnitEntity {

    const loc = new PlanetLoc(gameState.map, unit.location.x, unit.location.y);
    const entity = {
        loc,
        unit
    }
    if (unit.graphical) {
        updateGraphicalEntity(entity);
        gameState.map.updateFogOfWar(loc, entity.unit.details.vision);
    }
    return entity
}

export function updateGraphicalEntity(entity: UnitEntity) {

    if (!entity.unit.graphical) {
        throw new Error('cannot update graphics on unit without graphics');
    }

    if (entity.graphical && entity.graphical.mesh) {
        gameState.display.removeMesh(entity.graphical.mesh);
    }

    const scale = entity.unit.graphical.scale;

    const geom = getMesh(entity.unit.details.type);
    const mesh = entity.graphical && entity.graphical.mesh || new THREE.Group();
    mesh.copy(geom, true);
    mesh.scale.set(scale, scale, scale);
    mesh.rotation.x = -Math.PI / 2;
    mesh.children.map((obj: THREE.Object3D) => {
        obj.children.map((objMesh: THREE.Mesh) => {
            objMesh.castShadow = true;
            objMesh.receiveShadow = true;
            objMesh.userData = entity;
        });
    });

    // TODO flag colors
    applyToMaterials(mesh, (mat: THREE.MeshLambertMaterial) => {
        if (!mat) {
            throw new Error("mesh missing material");
        }

        // TODO
        /*if (mat.name.includes('flag')) {
            mat.color = new THREE.Color();
        }*/
        if (entity.unit.details.owner) {
            mat.color = getUnitColor(entity);
        }
        if (entity.unit.details.ghosting) {
            mat.transparent = true;
            mat.opacity = 0.2;
        } else {
            mat.transparent = false;
        }
    });
    mesh.name = `unit ${entity.unit.uuid}`;
    gameState.display.addMesh(mesh);
    entity.graphical = {
        movementDelta: 0,
        selectedLoc: null,
        selectionMesh: [],
        pathMesh: null,
        transferRangeMesh: null,
        pathLoc: null,
        prevPath: [],
        links: {},
        ...(entity.graphical || {}),
        mesh,
        ghosting: entity.unit.details.ghosting,
    }
    setToLocation(entity, entity.loc);

}

export function updateUnitEntity(state: GameState, entity: UnitEntity, delta: number) {

    const next = state.units[entity.unit.uuid];
    // Check for state changes, and update accordingly
    // entity.loc isn't updated until it has fully animated
    const loc = new PlanetLoc(state.map, entity.unit.location.x, entity.unit.location.y);
    if (!entity.loc.equals(loc) && entity.unit.movable) {
        animateToLocation(entity, loc, delta);
    } else if (!entity.unit.visible && entity.unit.movable) {
        // If the unit is movable and not visible, hide it
        destroyUnitEntity(entity);
    }
    if (!_.isEqual(next.graphical.model, entity.unit.graphical.model)) {
        // TODO
        // also should check scale
    }

    if (state.selectedUnits.includes(entity)) {
        markSelected(entity, loc);
        if (entity.unit.movable) {
            markPath(entity, loc);
        }
    } else {
        if (entity.graphical.selectionMesh) {
            clearSelected(entity);
        }
        if (entity.graphical.pathMesh) {
            clearPath(entity);
        }
    }

    // always update links in case if other units moved
    checkForLinks(entity);

    // Since the entity has handled all the changes, update it for the next frame.
    entity.unit = next;
    if (entity.graphical.ghosting !== next.details.ghosting) {
        console.log('no longer ghosting');
        updateGraphicalEntity(entity);
    }
}

export function destroyUnitEntity(entity: UnitEntity) {
    if (entity.graphical) {
        gameState.display.removeMesh(entity.graphical.mesh);
        clearPath(entity);
        clearSelected(entity);
    }
    delete gameState.unitEntities[entity.unit.uuid];
}

function applyToMaterials(mesh: THREE.Group, fn: (mat: THREE.MeshLambertMaterial) => void) {

    // mesh is a THREE.Group of all the objects for the unit
    // collada objects are an Object3D with children meshes from the model
    mesh.children.map((obj: THREE.Object3D) => {
        obj.children.map((objMesh: THREE.Mesh) => {
            if (!objMesh.material || (Array.isArray(objMesh.material) && objMesh.material.length === 0)) {
                const objmat = new THREE.MeshLambertMaterial({ color: new THREE.Color() });
                fn(objmat);
                objMesh.material = objmat;
                return;
            }
            if (Array.isArray(objMesh.material)) {
                objMesh.material = objMesh.material.map((mat: THREE.MeshLambertMaterial) => {
                    mat = mat.clone();
                    fn(mat as any);
                    return mat;
                })
            } else {
                const mat = objMesh.material.clone();
                fn(mat as any);
                objMesh.material = mat;
            }
        })
    })
}

function setToLocation(entity: UnitEntity, loc: PlanetLoc) {
    entity.loc = loc;
    entity.graphical.mesh.position.y = loc.real_z + 0.25;
    entity.graphical.mesh.position.x = loc.real_x;
    entity.graphical.mesh.position.z = - loc.real_y;
    if (entity.unit.details.size === 2) {
        //2x2 units have no 'center' and need to be offset
        entity.graphical.mesh.position.x += 0.5;
        entity.graphical.mesh.position.z -= 0.8;
    }
}

function animateToLocation(entity: UnitEntity, loc: PlanetLoc, delta: number) {
    const tps = gameState.map.tps;
    // speed / tps gets the number of seconds to reach the destination
    const frameDistance = (delta / (entity.unit.movable.speed / tps));
    const dv = entity.graphical.movementDelta += frameDistance;
    if (dv < 1) {
        const prev = entity.loc;
        const lerp = prev.getVec().lerp(loc.getVec(), dv);
        lerp.y += 0.25;
        entity.graphical.mesh.position.set(lerp.x, lerp.y, lerp.z);

        // I wish i knew what i was doing
        const angle = loc.getEuler().toVector3().add(
            new THREE.Vector3(-Math.PI / 2, 0, 0)
        );

        const x = (prev.x - loc.x) * (Math.PI / 2);
        const y = ((prev.y - loc.y) * Math.PI);
        angle.z = x + y;
        entity.graphical.mesh.setRotationFromEuler((new THREE.Euler()).setFromVector3(angle));
    } else {
        entity.graphical.movementDelta = 0;
        setToLocation(entity, loc);
        clearLinks(entity);
        clearTransferRange(entity);
        gameState.map.updateFogOfWar(loc, entity.unit.details.vision);
    }
}

function markSelected(entity: UnitEntity, loc: PlanetLoc) {
    if (!loc.equals(entity.graphical.selectedLoc)) {
        clearSelected(entity);
    }
    if (!entity.graphical.selectionMesh) {
        const selection: THREE.Mesh[] = [];
        selection.push(tileSquareMesh(loc, new THREE.Color('#7b44bf')));
        if (entity.unit.details.size === 2) {
            selection.push(tileSquareMesh(loc.N(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.E(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.E().N(), new THREE.Color('#7b44bf')));
        } else if (entity.unit.details.size === 3) {
            selection.push(tileSquareMesh(loc.N(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.N().E(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.N().W(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.E(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.W(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.S(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.S().W(), new THREE.Color('#7b44bf')));
            selection.push(tileSquareMesh(loc.S().E(), new THREE.Color('#7b44bf')));
        }
        gameState.display.addMesh(selection);
        entity.graphical.selectionMesh = selection;
    }
}

export function tileSquareMesh(loc: PlanetLoc, color: THREE.Color): THREE.Mesh {
    const corners = [
        new THREE.Vector3(-0.5, loc.corners[2] - loc.real_z, -0.5),
        new THREE.Vector3(0.5, loc.corners[3] - loc.real_z, -0.5),
        new THREE.Vector3(-0.5, loc.corners[0] - loc.real_z, 0.5),
        new THREE.Vector3(0.5, loc.corners[1] - loc.real_z, 0.5),
    ];
    const center = new THREE.Vector3(0, 0, 0);

    const edges = [[0, 1], [1, 3], [2, 0], [3, 2]];
    // create a trapezoid for each edge
    const thickness = 0.15;
    const selectedGeom = new THREE.Geometry();
    for (let i = 0; i < edges.length; i++) {
        const [j, k] = edges[i];
        selectedGeom.vertices.push(corners[j]);
        selectedGeom.vertices.push(corners[k]);
        selectedGeom.vertices.push(corners[j].clone().lerp(center, thickness));
        selectedGeom.vertices.push(corners[k].clone().lerp(center, thickness));
        const offset = i * 4;
        selectedGeom.faces.push(new THREE.Face3(offset, offset + 2, offset + 1));
        selectedGeom.faces.push(new THREE.Face3(offset + 1, offset + 2, offset + 3));
    }

    /*
    // useful for some material types;

            selectedGeom.computeBoundingSphere();
    selectedGeom.computeFaceNormals();
    selectedGeom.computeVertexNormals();
    const up = new THREE.Vector3(0, 0, 1);
    selectedGeom.faces[0].normal.copy(up);
    selectedGeom.faces[1].normal.copy(up);

    for (var i = 0; i <= 2; i++) {
        selectedGeom.faces[0].vertexNormals[i].copy(up);
        selectedGeom.faces[1].vertexNormals[i].copy(up);
    }
    */

    var selectedMaterial = new THREE.MeshBasicMaterial({
        color
    });

    const selectedMesh = new THREE.Mesh(selectedGeom, selectedMaterial);
    selectedMesh.name = 'selected';
    selectedMesh.position.copy(loc.getVec());
    selectedMesh.position.y += 0.05;
    return selectedMesh;
}

function clearSelected(entity: UnitEntity) {
    gameState.display.removeMesh(entity.graphical.selectionMesh);
    delete entity.graphical.selectionMesh;
    delete entity.graphical.selectedLoc;
}

function markPath(entity: UnitEntity, start: PlanetLoc) {
    const path = entity.unit.movable.path || [];
    if (!start.equals(entity.graphical.pathLoc) || path.length === 0 || !_.isEqual(path, entity.graphical.prevPath)) {
        clearPath(entity);
    }

    if (!entity.graphical.pathMesh && path.length > 1) {
        const verticalOffset = 0.5;
        const points: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];

        let prev = start;
        for (let i = 0; i < Math.min(40, path.length); i++) {
            let next: PlanetLoc;
            switch (path[i]) {
                case 'N':
                    next = prev.N();
                    break;
                case 'S':
                    next = prev.S();
                    break
                case 'E':
                    next = prev.E();
                    break;
                case 'W':
                    next = prev.W();
                    break;
                case 'C':
                    // shouldn't ever happen
                    continue;
                default:
                    throw new Error(`invalid value in path ${i}`);
            }
            const vec = next.getVec().clone().sub(start.getVec());
            prev = next;
            points.push(vec);
        }

        const pathCurve = new THREE.CatmullRomCurve3(points);

        const subdivisions = 6;
        const pathGeom = new THREE.Geometry();
        for (var i = 0; i < points.length * subdivisions; i++) {

            var t = i / (points.length * subdivisions);
            pathGeom.vertices[i] = pathCurve.getPoint(t);

        }

        pathGeom.computeLineDistances();

        var lineMaterial = new THREE.LineDashedMaterial({
            color: '#7b44bf',
            linewidth: 3,
            scale: 1,
            dashSize: 0.5,
            gapSize: 0.1,
        });

        const pathMesh = new THREE.Line(pathGeom, lineMaterial);
        pathMesh.name = 'path';
        pathMesh.position.copy(start.getVec());
        pathMesh.position.y += verticalOffset;
        gameState.display.addMesh(pathMesh);
        entity.graphical.pathMesh = pathMesh;
        entity.graphical.pathLoc = start;
        entity.graphical.prevPath = path;
    }
}

function clearPath(entity: UnitEntity) {
    gameState.display.removeMesh(entity.graphical.pathMesh);
    delete entity.graphical.pathMesh;
    delete entity.graphical.pathLoc;
    entity.graphical.prevPath = [];
}

export function isTileVisible(x: number, y: number): boolean {
    const units = _.filter(gameState.unitEntities, (entity) => {
        var deltaX = Math.abs(x - entity.unit.location.x);
        var deltaY = Math.abs(y - entity.unit.location.y);
        const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
        return distance < entity.unit.details.vision
            && entity.unit.details.owner === gameState.playerInfo.uuid
            && !entity.unit.details.ghosting;
    });
    return units.length > 0;
}

function clearLinks(entity: UnitEntity) {
    const links = Object.values(entity.graphical.links);
    if (links.length > 0) {
        links.map((link) => {
            gameState.display.removeMesh(link.line);
        })
        entity.graphical.links = {};
    }
}

function updateTransferRange(entity: UnitEntity) {
    // HACK is cleared when setting to location
    if (entity.graphical.transferRangeMesh) {
        return;
    }
    if (!entity.unit.storage.transferRange) {
        return;
    }

    const verticalOffset = 1;

    const curve = new THREE.EllipseCurve(0, 0,
        entity.unit.storage.transferRange,
        entity.unit.storage.transferRange,
        0, 2 * Math.PI,
        false, 0);
    const points2D = curve.getPoints(50);
    const points3D: THREE.Vector3[] = [];
    for (const point of points2D) {
        const loc = gameState.map.getLoc(Math.round(entity.loc.real_x + point.x), Math.round(entity.loc.real_y + point.y));
        const height = loc.getVec().y - entity.loc.y;
        points3D.push(new THREE.Vector3(point.x, point.y, height));
    }

    const pathCurve = new THREE.CatmullRomCurve3(points3D);

    const subdivisions = 6;
    const geometry = new THREE.Geometry();
    for (var i = 0; i < points3D.length * subdivisions; i++) {

        var t = i / (points3D.length * subdivisions);
        geometry.vertices[i] = pathCurve.getPoint(t);

    }
    geometry.computeLineDistances();
    const material = new THREE.LineDashedMaterial({
        color: 0x1fc157,
        depthTest: false,
        linewidth: 3,
        dashSize: 1,
        gapSize: 0.5,
    });

    const ellipse = new THREE.Line(geometry, material);
    ellipse.position.copy(entity.loc.getVec());
    ellipse.position.y += verticalOffset;
    ellipse.rotation.x = -Math.PI / 2;
    gameState.display.addMesh(ellipse);
    entity.graphical.transferRangeMesh = ellipse;
}

function clearTransferRange(entity: UnitEntity) {
    if (entity.graphical.transferRangeMesh) {
        gameState.display.removeMesh(entity.graphical.transferRangeMesh);
        delete entity.graphical.transferRangeMesh;
    }
}

export function checkForLinks(entity: UnitEntity) {
    if (entity.unit.details.owner !== gameState.playerInfo.uuid) {
        return;
    }
    if (!gameState.selectedUnits.includes(entity)) {
        clearLinks(entity);
        clearTransferRange(entity);
        return;
    }
    if (!config.showLinks) {
        clearLinks(entity);
        return;
    }

    // make 'select all' not a garbled mess of lines
    const linkVisibleUnits = ['transfer_tower', 'storage', 'transport', 'mine', 'builder'];
    if (!linkVisibleUnits.includes(entity.unit.details.type)) {
        return;
    }

    // priority:  towers > storage > mobile transports
    const resourceUnits = ['transfer_tower', 'storage', 'transport', 'mine']

    const storageUnits = _.filter(gameState.unitEntities, (entity2) => {
        return resourceUnits.includes(entity2.unit.details.type)
            && entity2.unit.details.owner === gameState.playerInfo.uuid
            && isResourceRange(entity.unit, entity2.unit);
    });

    // HACk links get cleared while setting to the new location
    updateLinks(entity, storageUnits);
    updateTransferRange(entity);
}

function isResourceRange(unit1: Unit, unit2: Unit): boolean {
    // not using planetLoc.distance for performance reasons
    var deltaX = Math.abs(unit1.location.x - unit2.location.x);
    var deltaY = Math.abs(unit1.location.y - unit2.location.y);
    const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
    return distance < unit2.storage.transferRange;
}

function updateLinks(unit: UnitEntity, units: UnitEntity[]) {
    for (const other of units) {
        let link = unit.graphical.links[other.unit.uuid];
        if (unit.graphical.links[other.unit.uuid]) {
            // check if the location updated
            if (link.loc.equals(other.loc)) {
                continue;
            }
            gameState.display.removeMesh(link.line);
        }
        const loc = other.loc.clone();
        const geom = new THREE.Geometry();
        geom.vertices.push(loc.getVec());
        geom.vertices.push(unit.loc.getVec());


        const lineMaterial = new THREE.LineBasicMaterial({
            color: '#1fc157',
            linewidth: 2,
        });
        lineMaterial.depthTest = false;
        const line = new THREE.Line(geom, lineMaterial);
        gameState.display.addMesh(line);
        link = {
            line,
            loc
        };
        unit.graphical.links[other.unit.uuid] = link;
    }
}

// get the unit color based on friend or foe (or self)
function getUnitColor(entity: UnitEntity): THREE.Color {
    // wars and alliances aren't implemented yet, so just doing self vs other for now
    if (entity.unit.details.owner === gameState.playerInfo.uuid) {
        return new THREE.Color(0x5194ff);
    } else {
        return new THREE.Color(0xf9ff68);
    }
}