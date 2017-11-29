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
    const mesh = new THREE.Group();
    mesh.copy(geom, true);
    mesh.scale.set(scale, scale, scale);
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = entity;

    // TODO flag colors
    applyToMaterials(mesh, (mat: THREE.MeshLambertMaterial) => {
        if (mat.name.includes('flag')) {
            (mat as any).color = new THREE.Color();
            mat.update();
        }
    });
    state.display.addMesh(mesh);
    entity.graphical = {
        ...(entity.graphical || {}),
        mesh,
        movementDelta: 0,
        selectedLoc: null,
        selectionMesh: null,
        pathMesh: null,
        pathLoc: null,
        prevPath: [],
    }
    setToLocation(entity, entity.loc);

}

export function updateUnitEntity(state: State, entity: UnitEntity, delta: number) {
    const prev = state.units[entity.unit.uuid];
    // Check for state changes, and update accordingly
    // entity.loc isn't updated until it has fully animated
    const loc = new PlanetLoc(state.map, entity.unit.location.x, entity.unit.location.y);
    if (!entity.loc.equals(loc) && entity.unit.movable) {
        console.log('location change');
        animateToLocation(state, entity, loc, delta);
    }
    if (!_.isEqual(prev.graphical.model, entity.unit.graphical.model)) {
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
    entity.unit = prev;
}

export function destroyUnitEntity(state: State, entity: UnitEntity) {
    if (entity.graphical) {
        state.display.removeMesh(entity.graphical.mesh);
    }
}

function applyToMaterials(mesh: THREE.Group, fn: (mat: THREE.MeshLambertMaterial) => void) {
    mesh.children.map((obj: THREE.Mesh) => {
        const objmat: THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] | undefined = obj.material as any;
        if (!objmat) {
            return;
        }
        if (Array.isArray(objmat)) {
            objmat.map((mat: THREE.MeshLambertMaterial) => fn(mat))
        } else {
            fn(objmat);
        }
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
    } else {
        entity.graphical.movementDelta = 0;
        setToLocation(entity, loc);
    }
}

function markSelected(state: State, entity: UnitEntity, loc: PlanetLoc) {
    if (!entity.graphical.selectionMesh) {
        // relative tile locations
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
            color: '#7b44bf'
        });

        const selectedMesh = new THREE.Mesh(selectedGeom, selectedMaterial);
        selectedMesh.position.copy(loc.getVec());
        selectedMesh.position.y += 0.05;
        state.display.addMesh(selectedMesh);
        entity.graphical.selectionMesh = selectedMesh;

    } else {
        if (!loc.equals(entity.graphical.selectedLoc)) {
            entity.graphical.selectionMesh.position.copy(loc.getVec());
            entity.graphical.selectionMesh.position.y += 0.05;
        }
    }

}

function clearSelected(state: State, entity: UnitEntity) {
    state.display.removeMesh(entity.graphical.selectionMesh);
    delete entity.graphical.selectionMesh;
    delete entity.graphical.selectedLoc;
}

function markPath(state: State, entity: UnitEntity, start: PlanetLoc) {
    const path = entity.unit.movable.path || [];
    if (!start.equals(entity.graphical.pathLoc) || path.length === 0 || !_.isEqual(path, entity.graphical.prevPath )) {
        clearPath(state, entity);
    }

    if (!entity.graphical.pathMesh && path.length > 0) {
        const verticalOffset = 0.5;
        const points: THREE.Vector3[] = [new THREE.Vector3(0,0,0)];

        let prev = start;
        for (let i = 0; i < Math.min(20, path.length); i++) {
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

        var selectedMaterial = new THREE.LineDashedMaterial({
            color: '#7b44bf',
            linewidth: 1,
            scale: 1,
            dashSize: 1,
            gapSize: 0.5,
        });

        const pathMesh = new THREE.Line(pathGeom);
        pathMesh.position.copy(start.getVec());
        pathMesh.position.y += verticalOffset;
        state.display.addMesh(pathMesh);
        entity.graphical.pathMesh = pathMesh;
        entity.graphical.pathLoc = start;
        entity.graphical.prevPath = path;

        console.log('rendering path');
    }
}

function clearPath(state: State, entity: UnitEntity) {
    state.display.removeMesh(entity.graphical.pathMesh);
    delete entity.graphical.pathMesh;
    delete entity.graphical.pathLoc;
    entity.graphical.prevPath = [];
}