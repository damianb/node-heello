var assert = require('assert'),
	path = require('path'),
	fs = require('fs'),
	heelloAPI = require('../lib/heello'),
	request = require('superagent'),
	pkg = require(__dirname + '/../package.json')

/**
 * This test suite requires that the test runner have their own OAuth2 credentials
 * to run the tests, storing them in $repo/test.config.json
 */
if(!fs.existsSync(path.normalize(__dirname + '/../test.config.json')))
	throw new Error('A test.config.json file must be present in the root of the repository to run tests')
var testConfig = require('../test.config.json')

describe('node-heello Authenticated REST API -', function() {
	var heello = new heelloAPI(testConfig)
		server = require('http').createServer(function(req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'})
			res.end(JSON.stringify({ response: require('url').parse(req.url, true).query }) + '\n')
		}).listen(9009)

	before(function(done) {
		var refreshToken = null, tokenFile = path.normalize(__dirname + '/../test.refreshtoken.json')

		if(fs.existsSync(tokenFile))
			refreshToken = require(tokenFile)

		if(!refreshToken) {
			throw new Error('no refresh token found - please obtain one and store it in ' + tokenFile)
		} else {
			heello.refreshTokens(refreshToken.token, function(err) {
				if(err) throw err
				fs.writeFileSync(tokenFile, JSON.stringify({ token: heello.refreshToken }))
				done()
			})
		}
	})

	describe('oauth endpoints -', function() {
		it('GET /oauth/token', function(done) {
			assert(heello.refreshToken, 'OAuth2 refresh token')
			assert(heello.accessToken, 'OAuth2 access token')
			done()
		})
	})

	describe('checkins endpoints -', function() {
		it('POST /checkins.json (heello.checkins.create)', function(done) {
			heello.checkins.create({
				'ping[place_id]': '322-0cab6928-e62b-4d48-a005-5199c61264d3',
				'ping[text]': 'node-heello test checkin - please ignore; will self-destruct shortly'
			}, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 201, 'request error - should return http 201')

				heello.pings.destroy({ id: json.response.id }, function(err, json, res) {
					assert.ifError(err, 'request error')
					done()
				})
			})
		})
	})

	describe('pings endpoints -', function() {
		var pingId
		it('POST /pings.json (heello.pings.create)', function(done) {
			heello.pings.create({
				'ping[text]':'node-heello test ping, please ignore; will self-destruct shortly'
			}, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 201, 'request error - should return http 201')
				pingId = json.response.id
				done()
			})
		})

		it('DELETE /pings/:id.json (heello.pings.destroy) - OWN PING', function(done) {
			heello.pings.destroy({ id: pingId }, function(err, json, res) {
				assert.ifError(err, 'request error')
				done()
			})
		})

		it('POST /pings/:id/echo.json (heello.pings.echo)', function(done) {
			heello.pings.echo({ id: 9033140 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 201, 'request error - should return http 201')
				pingId = json.response.id
				done()
			})

		})

		it('DELETE /pings/:id.json (heello.pings.destroy) - ECHOED PING', function(done) {
			heello.pings.destroy({ id: pingId }, function(err, json, res) {
				assert.ifError(err, 'request error')
				done()
			})
		})
	})

	describe('places endpoints -', function() {
		it('POST /places.json (heello.places.create)', function(done) {
			heello.places.create({
				'place[name]': 'node-heello test location',
				'place[latitude]': '46.420642',
				'place[longitude]': '-87.407412',
			}, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 200, 'request error - should return http 200')
				assert.equal(typeof json.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('users endpoints -', function() {
		var bio
		it('GET /users/:id/checkins.json (heello.users.checkins)', function(done) {
			heello.users.checkins({ count: 3 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert(json.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('POST /users/:id/listen.json (heello.users.listen)', function(done) {
			heello.users.listen({ id: 1 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 201, 'request error - should return http 201')
				assert.equal(typeof json.response, "object", 'response should be an object')
				done()
			})
		})

		it('GET /users/me.json (heello.users.me)', function(done) {
			heello.users.me(function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof json.response, "object", 'response should be an object')
				bio = json.response.bio
				done()
			})
		})

		it('PUT /accounts.json (heello.accounts.update) - CHANGE BIO', function(done) {
			heello.accounts.update({ 'user[bio]': 'node-heello test bio change' }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 200, 'request error - should return http 200')

				heello.accounts.update({ 'user[bio]': bio }, function(err, json, res) {
					assert.ifError(err, 'request error')
					assert.equal(res.status, 200, 'request error - should return http 200')
					done()
				})
			})
		})

		it('GET /users/notifications.json (heello.users.notifications)', function(done) {
			heello.users.notifications({ count: 3 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert(json.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /users/timeline.json (heello.users.timeline', function(done) {
			heello.users.timeline({ count: 3 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert(json.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('DELETE /users/:id/listen.json (heello.users.unlisten)', function(done) {
			heello.users.unlisten({ id: 1 }, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 200, 'request error - should return http 200')
				assert.equal(typeof json.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('timeline endpoints -', function() {
		// no endpoints
	})
})
