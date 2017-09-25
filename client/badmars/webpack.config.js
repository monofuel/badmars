module.exports = {
	entry: './client.tsx',
	output: {
		filename: 'badmars.js',
		path: __dirname + '/../../bin/public/badmars/js/'
	},

	devtool: 'source-map',

	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.json']
	},

	module: {
		rules: [
			{ test: /\.tsx?$/, loader: "awesome-typescript-loader" },
			{ enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
		]
	},
};