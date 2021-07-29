var webpack = require('webpack');
var path = require('path');

module.exports = {
	context: __dirname,
	entry: [
		'core-js',
		'lib/ko_addons',
		"./src/Main.js"
	],
	module: {
		loaders: [
			{test: /\.html$/, loader: "html"},
			{test: /\.css$/, loader: "style-loader!css-loader"},
			{test: /\.(jpe?g|png|gif|svg)$/i, loader: 'url?limit=10000'}
		]
	},
	resolve: {
		modules: [
			path.join(__dirname, "src"),
			path.join(__dirname, "node_modules")
		],
		extensions: ['', '.js']
	},
	output: {
		path: path.join(__dirname, '/web/build'),
		filename: "bundle.js",
		publicPath: 'build/'
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			compress: { warnings: false }
		})
	]
};
