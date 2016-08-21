//-----------------------------------
//	author: Monofuel
//	website: japura.net/badmars
//	Licensed under included modified BSD license

'use strict';

const db = require('../db/db.js');
const env = require('../config/env.js');
const logger = require('../util/logger.js');
const grpc = require('grpc');

const ai = grpc.load(__dirname + '/../protos/ai.proto').ai;
const aiClient = new ai.AI(env.aiHost + ':' + env.aiPort, grpc.credentials.createInsecure());

exports.init = () => {

	mapTick();

};

async function mapTick() {
	while (true) {
		let names = await db.map.listNames();
		let mapPromises = [];
		for (var name of names) {

			mapPromises.push(tryNewTick(name));
		}
		await Promise.all(mapPromises);
	}
}

async function tryNewTick(name) {
	let map = await db.map.getMap(name);

	let uCount = await db.units[name].countUnprocessedUnits(map.lastTick);
	let awakeCount = await db.units[name].countAwakeUnits();
	let allCount = await db.units[name].countAllUnits();

	console.log("(unprocessed/awake/all) | (" + uCount + "/" + awakeCount + "/" + allCount + ")");
	logger.addAverageStat('unprocessedUnitCount', uCount);
	logger.addAverageStat('totalUnitCount', allCount);
	logger.addAverageStat('totalAwakeCount', awakeCount);

	//console.log('sending process orders');
	while (true) {
		const unitKeys = await db.units[name].getUnprocessedUnitKeys(map.lastTick);
		if (unitKeys.length === 0) {
			break;
		}

		const unitPromises = [];
		for (let key of unitKeys) {
			const message = {uuid:key.uuid,mapName:map.name,tick:map.lastTick};
			unitPromises.push(new Promise((resolve,reject) => {
				aiClient.processUnit(message,(err,response) => {
					if (err) {
						return reject(err);
					}
					resolve(response);
				});
			}));
		}
		//console.log('requests sent');
		let results = await Promise.all(unitPromises).catch((err) => {
			console.log('grpc error:',err);
		});
		//TODO verify results
		//console.log('results are in');
	}
	//console.log('done processing orders');


	await map.advanceTick();

	return;
}
