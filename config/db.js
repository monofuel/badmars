var env = process.env.NODE_ENV || 'dev';
if (env === 'production') {
	module.exports = {
		server: '10.128.0.2'
	}
} else {
	module.exports = {
		server: 'localhost'
		//server: '10.128.0.2'
	}
}
