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
		var refreshToken = null
		if(fs.existsSync(path.normalize(__dirname + '/../test.refreshtoken.json')))
			refreshToken = require(__dirname + '/../test.refreshtoken.json')
		if(!refreshToken) {
			var query = {
				client_id: heello.conf.appId,
				redirect_uri: heello.conf.callbackURI,
				response_type: 'code',
				state: '42'
			}
			var cheerio = require('cheerio'), agent = new request.agent()

			require('async').waterfall([
				function(fn) {
					var req = request.post(heello.conf.protocol + '://' + heello.conf.domain + '/oauth/authorize')
						.set('User-Agent', heello.conf.userAgent)
						.type('form')
						.send(query)

					req.on('response', agent.saveCookies.bind(agent))
					req.on('redirect', agent.saveCookies.bind(agent))
					req.on('redirect', agent.attachCookies.bind(agent, req))
					agent.attachCookies(req)

					req.end(function(err, res) {
						if(err) {
							fn(err)
						} else {
							fn(null, res)
						}
					})
				},
				function(res, fn) {
					var req = request.post(heello.conf.protocol + '://' + heello.conf.domain + '/users/sign_in')
						.set('User-Agent', heello.conf.userAgent)
						.set('Referer', '')
						.type('form')
					agent.saveCookies(res)

					var inputs = cheerio.load(res.text)('form[action^="/users/sign_in"] input'), input = {},
						needed = ['authenticity_token', 'state', 'response_type', 'redirect_uri', 'client_id', 'commit']
					for(var i in inputs) {
						if(inputs[i].attribs !== undefined && needed.indexOf(inputs[i].attribs.name) !== -1)
							input[inputs[i].attribs.name] = inputs[i].attribs.value
					}
					input.utf8 = new Buffer('e29c93', 'hex').toString()
					req.send(input)
					req.send({ user: testConfig.account })

					req.on('response', agent.saveCookies.bind(agent))
					req.on('redirect', agent.saveCookies.bind(agent))
					req.on('redirect', agent.attachCookies.bind(agent, req))
					agent.attachCookies(req)

					req.end(function(err, res) {
						if(err) {
							fn(err)
						} else {
							fn(null, res)
						}
					})
				},
				function(res, fn) {
					if(Object.keys(res.body).length){
						fn(null, res)
						return
					}

					var req = request('POST', heello.conf.protocol + '://' + heello.conf.domain + '/oauth/authorize')
						.set('User-Agent', heello.conf.userAgent)
						.type('form')
					agent.saveCookies(res)

					var inputs = cheerio.load(res.text)('form[action^="/oauth/authorize"] input'), input = {},
						needed = ['authenticity_token', 'state', 'response_type', 'redirect_uri', 'client_id']
					for(var i in inputs) {
						if(inputs[i].attribs !== undefined && needed.indexOf(inputs[i].attribs.name) !== -1)
							input[inputs[i].attribs.name] = inputs[i].attribs.value
					}
					input.utf8 = new Buffer('e29c93', 'hex').toString()
					input.commit = 'Authorize'
					req.send(input)

					req.on('response', agent.saveCookies.bind(agent))
					req.on('redirect', agent.saveCookies.bind(agent))
					req.on('redirect', agent.attachCookies.bind(agent, req))
					agent.attachCookies(req)

					req.end(function(err, res) {
						if(err) {
							fn(err)
						} else {
							fn(null, res)
						}
					})
				},
				function(res, fn) {
					heello.getTokens(res.body.response.code, function(err) {
						if(err) {
							fn(err)
						} else {
							fs.writeFileSync(__dirname + '/../test.refreshtoken.json', JSON.stringify({ token: heello.refreshToken }))
							fn()
						}
					})
				},

			], function(err) {
				if(err) throw err
				done()
			})
		} else {
			heello.refreshTokens(refreshToken.token, function(err) {
				if(err) throw err
				fs.writeFileSync(__dirname + '/../test.refreshtoken.json', JSON.stringify({ token: heello.refreshToken }))
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
		it('POST /places.json (heello.places.create)')
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
