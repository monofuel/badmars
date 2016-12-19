/* @flow */

//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use struct';

import _ from 'lodash';

import db from '../db/db';
import env from '../config/env';
import logger from '../util/logger';

const ALL_COMPONENTS = ['details','movable','attack','storage','graphical','stationary','construct'];

const DETAIL_FIELDS = ['size','buildTime','cost','maxHealth'];
const MOVABLE_FIELDS = ['layer','speed'];
const ATTACK_FIELDS = ['layers','range','damage','fireRate'];
const STORAGE_FIELDS = ['maxIron','maxFuel','transferRange'];
const STATIONARY_FIELDS = ['layer'];
const GRAPHICAL_FIELDS = ['model','scale'];

const VALID_LAYERS = ['ground', 'air','water'];

const REQUIRED_COMPONENTS = {
  "details":[],
  "graphical":[]
};

const COMPONENT_DEFAULTS = {
  "details": {
    "size": 0,
    "buildTime": 0,
    "cost": 0,
    "maxHealth": 0
  },
  "storage": {
    "maxIron": 0,
    "maxFuel": 0,
    "transferRange": 0,
  }
};

export default class UnitStat {

  type: string;
  details: Object;
  movable: Object;
  attack: Object;
  storage: Object;
  graphical: Object;
  stationary: Object;

  constructor(type: string, stats: Object) {
    _.defaultsDeep(this,stats);
    _.defaultsDeep(this,COMPONENT_DEFAULTS);
    this.type = type;
  }

  validateSync() {
    if (!env.debug) {
      return;
    }
    _.map(Object.keys(this),(key) => {
      if (key !== 'type' && !_.includes(ALL_COMPONENTS,key)) {
        throw new Error('invalid component named ' + key);
      }
    })

    const self = this;
    function throwError(msg: string) {
      throw new Error(msg + " for " + self.type);
    }

    //==============================
    // DETAILS
    //==============================

    if (!this.details) {
      throwError('missing detail component');
    }
    if (typeof this.details.size !== 'number') {
      throwError('invalid size');
    }
    if (typeof this.details.buildTime !== 'number') {
      throwError('invalid build time');
    }
    if (typeof this.details.cost !== 'number') {
      throwError('invalid cost');
    }
    if (typeof this.details.maxHealth !== 'number') {
      throwError('invalid max health');
    }
    _.map(this.details,(value,key) => {
      if (!_.includes(DETAIL_FIELDS,key)) {
        throwError("bad detail field " + key);
      }
    });

    //==============================
    // STORAGE
    //==============================
    if (!this.storage) {
      throwError('missing storage component');
    }
    if (typeof this.storage.maxIron !== 'number') {
      throwError('invalid maxIron');
    }
    if (typeof this.storage.maxFuel !== 'number') {
      throwError('invalid maxFuel');
    }
    if (typeof this.storage.transferRange !== 'number') {
      throwError('invalid transferRange');
    }

    _.map(this.storage,(value,key) => {
      if (!_.includes(STORAGE_FIELDS,key)) {
        throwError("bad storage field " + key);
      }
    });

    //==============================
    // MOVABLE
    //==============================

    if (this.movable) {
      if (!_.includes(VALID_LAYERS,this.movable.layer)) {
        throwError('invalid movement layer');
      }
      if (typeof this.movable.speed !== 'number' || this.movable.speed === 0) {
        throwError('invalid movement speed');
      }

      _.map(this.movable,(value,key) => {
        if (!_.includes(MOVABLE_FIELDS,key)) {
          throwError("bad movable field " + key);
        }
      });
    }

    //==============================
    // ATTACK
    //==============================
    if (this.attack) {
      if (!Array.isArray(this.attack.layers)) {
        throwError('attack layers need to be a list of layers');
      }
      if (this.attack.layers.length === 0) {
        throwError('attack has to have layers');
      }
      _.each(this.attack.layers,(layer) => {
        if (!_.includes(VALID_LAYERS,layer)) {
          throwError('invalid layer ' + layer);
        }
      });
      if (typeof this.attack.range !== 'number') {
        throwError('attack range needs to be a number');
      }
      if (typeof this.attack.fireRate !== 'number') {
        throwError('attack fireRate needs to be a number');
      }
      if (typeof this.attack.damage !== 'number') {
        throwError('attack damage needs to be a number');
      }
      _.map(this.attack,(value,key) => {
        if (!_.includes(ATTACK_FIELDS,key)) {
          throwError("bad attack field " + key);
        }
      });
    }

    //==============================
    // STATIONARY
    //==============================

    if (this.stationary) {
      if (!_.includes(VALID_LAYERS,this.stationary.layer)) {
        throwError('invalid stationary layer');
      }

      _.map(this.stationary,(value,key) => {
        if (!_.includes(STATIONARY_FIELDS,key)) {
          throwError("bad stationary field " + key);
        }
      });
    }

    //==============================
    // CONSTRUCT
    //==============================

    if (this.construct) {
      if (!Array.isArray(this.construct)) {
        throwError('construct needs to be an array');
      }
    }

    //==============================
    // GRAPHICAL
    //==============================

    if (this.graphical) {
      if (!this.graphical.model) {
        throwError("model is missing");
      }
      if (typeof this.graphical.model !== 'string') {
        throwError("model is invalid");
      }
      if (!this.graphical.model.includes('.obj')) {
        throwError("only OBJ is supported");
      }
      if (!this.graphical.scale) {
        throwError("model scale is missing");
      }
      if (typeof this.graphical.scale !== 'number') {
        throwError('model scale needs to be a number');
      }
      _.map(this.graphical,(value,key) => {
        if (!_.includes(GRAPHICAL_FIELDS,key)) {
          throwError("bad graphical field " + key);
        }
      });
    }

  }

  async validateAsync() {
    if (!env.debug) {
      return;
    }

    this.validateSync()

    //do async validation work

    return Promise.resolve();
  }

  clone(other: Object) {
    _.assign(this,other);
  }
}
