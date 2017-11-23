import PlanetLoc from '../map/planetLoc'
import State from '../state';
import { getMesh } from './unitModels';
import * as THREE from 'three';
import * as _ from 'lodash';

export interface GraphicalEntity {
    mesh: THREE.Group
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
    }
    setToLocation(entity, entity.loc);

}

export function updateUnitEntity(state: State, entity: UnitEntity, delta: number) {
    const prev = state.units[entity.unit.uuid];
    // Check for state changes, and update accordingly
    if (!_.isEqual(prev.location, entity.unit.location)) {
        console.log('location change');
        // TODO animate to next position
        const loc = new PlanetLoc(state.map, entity.unit.location.x, entity.unit.location.y);
        setToLocation(entity, loc);
    }
    if (!_.isEqual(prev.graphical.model, entity.unit.graphical.model)) {
        // TODO
        // also should check scale
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