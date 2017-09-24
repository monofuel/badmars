import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText, CardMedia, CardTitle } from 'material-ui/Card';

import Registration from './auth/registration'

type Self = {
	uuid: string;
	username: string;
	email: string;
}

type FrontpageProps = {
	self: null | Self;
}

export default class Frontpage extends React.Component<FrontpageProps,{}> {
	render() {
		const { self } = this.props;
		return (
			<div className='pane-content'>
				<div className='pane-row'>
					<WelcomePane/>
					{ !self && <Registration/> }
				</div>
				<div className='pane-row'>
					<ResourcePane/>
					<StoragePane/>
				</div>
			</div>
		);
	}
}

export class WelcomePane extends React.Component<{},{}> {
	render() {
		return (
			<Paper className='info-paper' zDepth={5}>
			{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
			<Card>
				<CardHeader title='Welcome'/>
				<CardMedia 
					overlay={<CardTitle title='Not Mars' subtitle='Totally does not look like mars' />}
				>
					<img src='/images/land.png' alt=''/>
				</CardMedia>
				<CardText>
					Work in progress Multiplayer RTS.
				</CardText>
			</Card>
		</Paper>
		)
	}
}

export class ResourcePane extends React.Component<{},{}> {
	render() {
		return (
			<Paper className='info-paper' zDepth={5}>
			{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
			<Card>
				<CardHeader title='Resources'/>
				<CardMedia 
					overlay={<CardTitle title='Gather' subtitle='Gather resources to build your empire' />}
				>
					<img style={{ maxHeight: '350px', maxWidth: '550px' }} src='/images/resource.png' alt=''/>
				</CardMedia>
				<CardText>
					<p>
						Explore an endless procedurally generated planet of mountains and oceans that is rich with resources.
					</p>
					<p>
						<b>Iron</b> Is used for the construction of buildings and vehicles. You will need to control as much
						iron as possible if you want to build sturdy defenses, and devistating offensive forces. Controlling
						iron deposits will not be enough, however, as you will also need to create and defend the supply routes to get
						the iron to your factories and constructors.
					</p>
					<p>
						<b>Oil</b> is refined into fuel, and is used to power your vehicles and power plants. It is crucial,
						because it is the life blood of your empire. Without fuel, your units and buildings will not be able
						to move, and will deteriorate in the harsh atmosphere. Stock up your own bases with excessive fuel
						reserves, while taking out critical enemy fuel supply lines to watch their bases crumble with minimal effort.
					</p>
				</CardText>
			</Card>
		</Paper>
		)
	}
}
export class StoragePane extends React.Component<{},{}> {
	render() {
		return (
			<Paper className='info-paper' zDepth={5}>
			{/* https://www.youtube.com/watch?v=gzU_4NNfmi4 */}
			<Card>
				<CardHeader title='Storage'/>
				<CardMedia 
					overlay={<CardTitle title='Construction' subtitle='Build bases to utilize your resources' />}
				>
					<img style={{ maxHeight: '350px', maxWidth: '550px' }} src='/images/storage.png' alt=''/>
				</CardMedia>
				<CardText>
					<p>
						Your units and buildings will hold your resources. You will need to control protected convoys
						of transporters to deliver iron to where you want to construct a new base. Armies of tanks or
						planes will need to move with transporters of fuel if they want to survive a long distance offensive.
					</p>
				</CardText>
			</Card>
		</Paper>
		)
	}
}