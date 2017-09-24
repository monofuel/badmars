
'use strict';

// monofuel
// 7-22-2016
import React from 'react';

import ProfileCard from './profileCard.jsx';

const stats = [
    'unit_AI',
    'unitRequest',
    'getChunk',
    'getMap',
    'getUnitsAtChunk',
    'getUnitsAtTile',
    'loadUnit',
    'updateUnit',
    'chunkCacheHit',
    'mapCacheHit',
    'mapCacheMissOrRefresh',
    'addChunkToCache',
    'chunkCacheSize'
];
const metrics = ['executions','avg','sum'];
//const modules = ['ai','net','chunk','pathfinder','simulate','web'];

type Props = {}
type State = {}

type chartType = {
    key: string,
    module: string,
    stat: string,
    metric: string
}

export default class ProfileList extends React.Component {
	state: State;
	props: Props;
	render() {
        const chartTypes = [];
        stats.map((stat) => {
            metrics.map((metric) => {
                chartTypes.push({
                    key: metric + '-' + stat,
                    metric,
                    stat
                });
            });
        });
		return (
			<div>
				<div>
					{chartTypes.map((type) => {
                        const {key,stat,metric} = type;
                        return <ProfileCard key={key} title={key} stat={stat} metric={metric} />
                    })}
				</div>
			</div>
		)
	}
}
