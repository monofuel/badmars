import PlanetLoc from '../map/planetLoc'
import State from '../state';
import { getMesh } from './unitModels';
import * as THREE from 'three';
import * as _ from 'lodash';

export interface GraphicalEntity {
    mesh: THREE.Group
    movementDelta: number
    selectedLoc: PlanetLoc | null;
    selectionMesh: THREE.Mesh | null;
    pathMesh: THREE.Line | null;
    pathLoc: PlanetLoc | null;
    prevPath: string[];
    ghosting: boolean;
    links: {
        [key: string]: THREE.Line;
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

export function newUnitEntity(state: State, unit: Unit): UnitEntity {

    const loc = new PlanetLoc(state.map, unit.location.x, unit.location.y);
    const entity = {
        loc,
        unit
    }
    if (unit.graphical) {
        updateGraphicalEntity(state, entity);
        state.map.updateFogOfWar(loc, entity.unit.details.vision);
    }
    return entity
}

export function updateGraphicalEntity(state: State, entity: UnitEntity) {

    if (!entity.unit.graphical) {
        throw new Error('cannot update graphics on unit without graphics');
    }

    if (entity.graphical && entity.graphical.mesh) {
        state.display.removeMesh(entity.graphical.mesh);
    }

    const scale = entity.unit.graphical.scale;

    const geom = getMesh(entity.unit.details.type);
    const mesh = entity.graphical && entity.graphical.mesh || new THREE.Group();
    mesh.copy(geom, true);
    mesh.scale.set(scale, scale, scale);
    mesh.rotation.x = -Math.PI / 2;
    mesh.children.map((obj: THREE.Object3D) => {
        obj.children.map((objMesh: THREE.Mesh) => {
            objMesh.userData = entity;
        });
    });

    // TODO flag colors
    applyToMaterials(mesh, (mat: THREE.MeshLambertMaterial) => {
        if (!mat) {
            throw new Error("mesh missing material");
        }

        if (mat.name.includes('flag')) {
            mat.color = new THREE.Color();
        }
        if (entity.unit.details.ghosting) {
            mat.transparent = true;
            mat.opacity = 0.2;
        } else {
            mat.transparent = false;
        }
    });
    mesh.name = `unit ${entity.unit.uuid}`;
    state.display.addMesh(mesh);
    entity.graphical = {
        movementDelta: 0,
        selectedLoc: null,
        selectionMesh: null,
        pathMesh: null,
        pathLoc: null,
        prevPath: [],
        links: {},
        ...(entity.graphical || {}),
        mesh,
        ghosting: entity.unit.details.ghosting,
    }
    setToLocation(entity, entity.loc);
    checkForLinks(state, entity);

}

export function updateUnitEntity(state: State, entity: UnitEntity, delta: number) {

    const next = state.units[entity.unit.uuid];
    // Check for state changes, and update accordingly
    // entity.loc isn't updated until it has fully animated
    const loc = new PlanetLoc(state.map, entity.unit.location.x, entity.unit.location.y);
    if (!entity.loc.equals(loc) && entity.unit.movable) {
        animateToLocation(state, entity, loc, delta);
    } else if (!entity.unit.visible && entity.unit.movable) {
        // If the unit is movable and not visible, hide it
        destroyUnitEntity(state, entity);
    }
    if (!_.isEqual(next.graphical.model, entity.unit.graphical.model)) {
        // TODO
        // also should check scale
    }

    if (state.selectedUnits.includes(entity)) {
        markSelected(state, entity, loc);
        if (entity.unit.movable) {
            markPath(state, entity, loc);
        }
    } else {
        if (entity.graphical.selectionMesh) {
            clearSelected(state, entity);
        }
        if (entity.graphical.pathMesh) {
            clearPath(state, entity);
        }
    }

    // Since the entity has handled all the changes, update it for the next frame.
    entity.unit = next;
    if (entity.graphical.ghosting !== next.details.ghosting) {
        console.log('no longer ghosting');
        updateGraphicalEntity(state, entity);
    }
}

export function destroyUnitEntity(state: State, entity: UnitEntity) {
    if (entity.graphical) {
        state.display.removeMesh(entity.graphical.mesh);
        clearPath(state, entity);
        clearSelected(state, entity);
    }
    delete state.unitEntities[entity.unit.uuid];
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
}

function animateToLocation(state: State, entity: UnitEntity, loc: PlanetLoc, delta: number) {
    const tps = state.map.tps;
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
        // HACK
        // for some reason jsonpatch has a bug where it duplicates the last element
        entity.unit.movable.path.pop();
        entity.graphical.movementDelta = 0;
        setToLocation(entity, loc);
        state.map.updateFogOfWar(loc, entity.unit.details.vision);
    }
}

function markSelected(state: State, entity: UnitEntity, loc: PlanetLoc) {
    if (!loc.equals(entity.graphical.selectedLoc)) {
        clearSelected(state, entity);
    }
    if (!entity.graphical.selectionMesh) {
        const selectedMesh = tileSquareMesh(loc, new THREE.Color('#7b44bf'));
        state.display.addMesh(selectedMesh);
        entity.graphical.selectionMesh = selectedMesh;

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

function clearSelected(state: State, entity: UnitEntity) {
    state.display.removeMesh(entity.graphical.selectionMesh);
    delete entity.graphical.selectionMesh;
    delete entity.graphical.selectedLoc;
}

function markPath(state: State, entity: UnitEntity, start: PlanetLoc) {
    const path = entity.unit.movable.path || [];
    if (!start.equals(entity.graphical.pathLoc) || path.length === 0 || !_.isEqual(path, entity.graphical.prevPath)) {
        clearPath(state, entity);
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
        state.display.addMesh(pathMesh);
        entity.graphical.pathMesh = pathMesh;
        entity.graphical.pathLoc = start;
        entity.graphical.prevPath = path;
    }
}

function clearPath(state: State, entity: UnitEntity) {
    state.display.removeMesh(entity.graphical.pathMesh);
    delete entity.graphical.pathMesh;
    delete entity.graphical.pathLoc;
    entity.graphical.prevPath = [];
}

export function isTileVisible(state: State, x: number, y: number): boolean {
    const units = _.filter(state.unitEntities, (unit) => {
        var deltaX = Math.abs(x - unit.unit.location.x);
        var deltaY = Math.abs(y - unit.unit.location.y);
        const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
        return distance < unit.unit.details.vision
            && unit.unit.details.owner === state.playerInfo.uuid
            && !unit.unit.details.ghosting;
    });
    return units.length > 0;
}

export function checkForLinks(state: State, unit: UnitEntity) {
    if (unit.unit.details.owner !== state.playerInfo.uuid) {
        return;
    }
    // priority:  towers > storage > mobile transports
    const resourceUnits = ['transfer_tower', 'storage', 'transport', 'mine']

    const storageUnits = _.filter(state.unitEntities, (unit2) => {
        return resourceUnits.includes(unit2.unit.details.type)
            && unit2.unit.details.owner === state.playerInfo.uuid
            && isResourceRange(unit.unit, unit2.unit);
    });
    updateLinks(unit, storageUnits);
}
function isResourceRange(unit1: Unit, unit2: Unit): boolean {
    // not using planetLoc.distance for performance reasons
    var deltaX = Math.abs(unit1.location.x - unit2.location.x);
    var deltaY = Math.abs(unit1.location.y - unit2.location.y);
    const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
    return distance < unit2.storage.transferRange
        && !unit2.details.ghosting;
}

function updateLinks(unit: UnitEntity, units: UnitEntity[]) {
    for (const other of units) {
        if (unit.graphical.links[other.unit.uuid]) {
            // check if the location updated
        }
    }
}