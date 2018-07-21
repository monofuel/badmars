import * as React from 'react';

import { autobind } from 'core-decorators';
import { StatsChange } from '../state';
import { Paper } from 'material-ui';
const { XYPlot, VerticalBarSeries, XAxis, YAxis } = require('react-vis');

const serverStatStyle = {
  position: 'absolute',
  width: '400px',
  top: '5%',
  bottom: '10%',
  left: '5%',
  right: 'auto',
  marginLeft: 'auto',
  marginRight: 'auto',
  height: 'auto',
  padding: '5px',
  zIndex: '5',
}

interface StatsObj {
  [key: string]: number[];
}

export default class ServerStats extends React.Component<{}, {}> {
  stats: StatsObj = {};
  componentDidMount() {
    StatsChange.attach(this.handleServerStats);
  }
  @autobind()
  handleServerStats(obj: any) {

    const max = 70;
    for (const field of Object.keys(obj.stats)) {
      if (field === 'timestamp') {
        continue;
      }
      if (this.stats[field]) {
        this.stats[field].unshift(obj.stats[field]);
        if (this.stats[field].length > max) {
          this.stats[field].pop();
        }
      } else {
        this.stats[field] = [obj.stats[field]];
        while (this.stats[field].length < max) {
          this.stats[field].push(0);
        }
      }
    }
    for (const field of Object.keys(this.stats)) {
      if (!obj.stats[field]) {
        this.stats[field].unshift(0);
        if (this.stats[field].length > max) {
          this.stats[field].pop();
        }
      }
    }
    this.forceUpdate();
  }

  public render() {

    const dataList: any = {};
    for (const field of Object.keys(this.stats)) {
      if (!field.startsWith('avg')) {
        continue;
      }
      const array = this.stats[field];
      const data = array.map((y, x) => ({ x, y: y / 1000 }));
      let highValues = false;
      for (const { x, y } of data) {
        if (y > 0.002) {
          highValues = true;
        }
      }
      if (!highValues) {
        continue;
      }

      dataList[field] = data;
    }

    return (
      <Paper
        zDepth={3}
        id='serverStats'
        style={serverStatStyle as any}>
        <div style={{ height: '100%', overflowY: 'scroll' }}>
          {
            Object.entries(dataList).map(([key, data]) => {
              return (
                <div key={key}>
                  <p style={{ margin: 0, fontSize: '12px' }}>{key}</p>
                  <XYPlot height={120} width={350}>
                    <XAxis />
                    <YAxis />
                    <VerticalBarSeries data={data} />
                  </XYPlot>
                </div>
              )
            })
          }
        </div>
      </Paper>
    );
  }
}