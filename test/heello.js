var assert = require('assert'),
	heelloAPI = require('../lib/heello'),
	request = require('superagent'),
	pkg = require(__dirname + '/../package.json')

/**
 * This test suite requires that the test runner have their own OAuth2 credentials
 * to run the tests, storing them in /test.config.json
 */
if(require('fs').existsSync('../test.config.json'))
	throw new Error('A test.config.json file must be present in the root of the repository to run tests')
var testConfig = require('../test.config.json')

describe('node-heello -', function() {
	describe('configuration', function() {
		it('throws on empty or no config', function(done) {
			assert.throws(function() {
				var heello = new heelloAPI({})
			}, Error)
			done()
		})
		it('throws when missing required key "appId"', function(done) {
			assert.throws(function() {
				var heello = new heelloAPI({
					appSecret: '0'
				})
			}, Error)
			done()
		})
		it('throws when missing required key "appSecret"', function(done) {
			assert.throws(function() {
				var heello = new heelloAPI({
					appId: '0'
				})
			}, Error)
			done()
		})

		it('throws when required keys "appId" and "appSecret" are empty', function(done) {
			assert.throws(function() {
				var heello = new heelloAPI({
					appId: '',
					appSecret: ''
				})
			}, Error)
			done()
		})

		it('configurations have not been modified in constructor', function(done) {
			var heello = new heelloAPI(testConfig)

			assert.equal(heello.conf.appId, testConfig.appId, 'appId')
			assert.equal(heello.conf.appSecret, testConfig.appSecret, 'appSecret')
			assert.equal(heello.conf.callbackURI, testConfig.callbackURI, 'callbackURI')

			done()
		})

		it('using proper API configuration defaults', function(done) {
			var heello = new heelloAPI({
				appId: testConfig.appId,
				appSecret: testConfig.appSecret,
			})

			assert.equal(heello.conf.protocol, 'https', 'protocol')
			assert.equal(heello.conf.domain, 'api.heello.com', 'domain')
			assert(heello.conf.userAgent.match(/^node\-heello v/), 'userAgent')

			done()
		})
	})

	describe('REST API -', function() {
		var heello = new heelloAPI(testConfig)
			//server = require('http').createServer(function(req, res) {
			//	var uri = require('url').parse(req.url, true)
			//	console.dir(uri.query)
			//}).listen(9009)

		describe('oauth endpoints -', function() {
			it('GET /oauth/authorize')

			it('GET /oauth/token')
			//it('GET /oauth/authorize', function(done) {
			//	var authURI = heello.getAuthURI('http://127.0.0.1:9009/', 'TESTSTATE')
			//	console.dir(authURI)
			//	done()
			//})
		})

		describe('accounts endpoints -', function() {
			it('PUT /accounts/update')
		})

		describe('checkins endpoints -', function() {
			it('POST /checkins/create')

			it('GET /checkins/:id', function(done) {
				heello.checkins.show({ id: 8002938 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert.equal(typeof res.response, "object", 'response should be an object')
					done()
				})
			})
		})

		describe('pings endpoints -', function() {
			it('POST /pings/create')

			it('DELETE /pings/:id')

			it('POST /pings/:id/echo')

			// @NOTE: seems to 406 for some reason;
			// heello seems to not handle the Accept versioning header on this endpoint right
			/*
			it('GET /pings/pings', function(done) {
				heello.pings.pings({}, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})
			*/

			it('GET /pings/search', function(done) {
				heello.pings.search({ query: "heello" }, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})

			it('GET /pings/:id', function(done) {
				heello.pings.show({ id: 8188091 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert.equal(typeof res.response, "object", 'response should be an object')
					done()
				})
			})
		})

		describe('places endpoints -', function() {
			// @note this will never be tested for obv reasons.
			//it('POST /places/create')

			it('GET /places/search', function(done) {
				heello.places.search({ name: 'Starbucks' }, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})

			it('GET /places/:id', function(done) {
				heello.places.show({ id: '322-0cab6928-e62b-4d48-a005-5199c61264d3' }, function(err, res) {
					assert.ifError(err, 'request error')
					assert.equal(typeof res.response, "object", 'response should be an object')
					done()
				})
			})
		})

		describe('users endpoints -', function() {
			it('GET /users/:id/checkins')

			it('GET /users/:id/listen')

			it('GET /users/listeners', function(done) {
				heello.users.listeners({ id: 'katana', username: 1 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})

			it('GET /users/listening', function(done) {
				heello.users.listening({ id: 'katana', username: 1 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})

			it('GET /users/lookup',  function(done) {
				heello.users.lookup({ ids: ['katana'], username: 1 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})

			it('GET /users/me')

			it('GET /users/notifications')

			it('GET /users/:id/pings', function(done) {
				heello.users.pings({ id: 'katana', username: 1 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert.equal(typeof res.response, "object", 'response should be an object')
					done()
				})
			})

			it('GET /users/:id', function(done) {
				heello.users.show({ id: 'katana', username: 1 }, function(err, res) {
					assert.ifError(err, 'request error')
					assert.equal(typeof res.response, "object", 'response should be an object')
					done()
				})
			})

			it('GET /users/timeline')

			it('DELETE /users/:id/listen')
		})

		describe('timeline endpoints -', function() {
			it('GET /timeline/public', function(done) {
				heello.timeline.public({}, function(err, res) {
					assert.ifError(err, 'request error')
					assert(res.response instanceof Array, 'response should be an array')
					done()
				})
			})
		})
	})
})


function checkReply() {
	// asdf
}

function checkResponse() {
	// asdf
}

function checkPing() {
	// asdf
}
