const path = require('path');
const webpack = require('webpack');

/* note: this does not actaully work and explodes horribly. do not use. */
/* this file is a monument to how awful javascript is. */
/* Try to run the generated chunk.entry.js if you dare */

module.exports = {
    entry: {
        chunk: './server/nodejs/chunk.js'
    },
    target: 'node',
    cache: true,
    devtool: 'inline-source-map',
    output: {
        path: path.join(__dirname, "bin"),
        filename: "[name].entry.js"
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    },
}