
'use strict';

// monofuel
// 7-22-2016
import _ from 'lodash';
import React from 'react';
import Chart from 'react-google-chart';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';

import {makeRequest} from './apiHandler.js';

type Props = {
	title: string,
	stat: string,
	cutoff?: number,
	metric: string
}
type dataPoint = {
	timestamp: number,
	time: string,
	value: number,
	module: string
}

type State = {
	data: Array < Array < any >>,
	options: Object
}

const defaultOptions = {
	title: 'default title',
	hAxis: {
		title: 'Time'
	},
	vAxis: {
		title: 'Metric'
	},
	legend: 'none'
}

const header = [
	'time',
	'ai',
	'net',
	'chunk',
	'pathfinder',
	'simulate',
	'web'
];

export default class ProfileCard extends React.Component {
	state : State = {
		data: [header],
		options: _.clone(defaultOptions)
	}
	props : Props;
	componentDidMount() {
		this._updateProfile()
	}

	render() {
		const {data, options} = this.state;
		if (data.length <= 1) {
			//console.log('no data for metric',this.props);
			return (null);
		}
		options.title = this.props.title;
		options.vAxis.title = this.props.metric;
		console.log(options);

		return (
			<Card>
				<CardHeader title={this.props.title} actAsExpander={true} showExpandableButton={true}/>
				<CardText expandable={true}>
					<Chart chartType="LineChart" data={data} options={options} width={"100%"} height={"400px"} legend_toggle={true}/>
				</CardText>
			</Card>
		);

	}
	async _updateProfile() {
		const {stat, cutoff, metric} = this.props;
		const self = this;
		const params = {
			stat,
			metric
		}

		const data = await makeRequest('/serverProfiler','GET',params);
		self._parseData(data);
	}

	_parseData(serverData : Array < dataPoint >) {
		const {metric} = this.props;
		const newData : Array < Array < any >> = [header];
		serverData.map((point : dataPoint) => {
			const time = new Date(point.timestamp);
			point.time = pad(time.getHours()) + ':' + pad(time.getMinutes());
		})
		const modules = [
			'ai',
			'net',
			'chunk',
			'pathfinder',
			'simulate',
			'web'
		];

		const times = _.map(serverData, "time");
		times.map((time) => {
			const eventsInTime = _.filter(serverData, {time});
			let values = [time];
			for (let i = 0; i < modules.length; i++) {
				let module = modules[i];
				const modulePoints = _.filter(eventsInTime, {module});
				switch (metric) {
					case "avg":
						let value = _.mean(_.map(modulePoints, "value"));
						if (isNaN(value))
							value = 0;
						values.push(value);
						break;
					case "executions":
					case "sum":
						values.push(_.sum(_.map(modulePoints, "value")));
						break;
					default:
						values.push(0);
				}
			}
			newData.push(values);
		});
		console.log(newData);
		this.setState({data: newData});
	}
}

function pad(num : number) : string {
	const numText = '' + num;
	if (numText.length == 1) {
		return '0' + numText;
	}
	return numText;
}
