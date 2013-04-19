var assert = require('assert'),
	path = require('path'),
	heelloAPI = require('../lib/heello'),
	request = require('superagent'),
	pkg = require(__dirname + '/../package.json')

/**
 * This test suite requires that the test runner have their own OAuth2 credentials
 * to run the tests, storing them in /test.config.json
 */
if(!require('fs').existsSync(path.normalize(__dirname + '/../test.config.json')))
	throw new Error('A test.config.json file must be present in the root of the repository to run tests')
var testConfig = require('../test.config.json')

describe('node-heello Authenticated REST API -', function() {
	var heello = new heelloAPI(testConfig)
		server = require('http').createServer(function(req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'})
			res.end(JSON.stringify({ response: require('url').parse(req.url, true).query }) + '\n')
		}).listen(9009)

	before(function(done) {
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
					if(err) throw err
					fn(null, res)
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
					if(err) throw err
					fn(null, res)
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
					if(err) throw err
					fn(null, res)
				})
			},
			function(res, fn) {
				heello.refreshTokens(res.body.response.code, fn)
			}
		], function(err) {
			if(err) throw err
			done()
		})
	})

	describe('oauth endpoints -', function() {
		it('GET /oauth/authorize', function(done) {
			assert(heello.code, 'OAuth2 refresh code')
			done()
		})

		it('GET /oauth/token', function(done) {
			assert(heello.refreshToken, 'OAuth2 refresh token')
			assert(heello.accessToken, 'OAuth2 access token')
			done()
		})
	})

	describe('accounts endpoints -', function() {
		it('PUT /accounts/update (heello.accounts.update)')
	})

	describe('checkins endpoints -', function() {
		it('POST /checkins/create (heello.checkins.create)')
	})

	describe('pings endpoints -', function() {
		it('POST /pings.json (heello.pings.create)', function(done) {
			heello.pings.create({
				'ping[text]':'node-heello test ping'
			}, function(err, json, res) {
				assert.ifError(err, 'request error')
				assert.equal(res.status, 201, 'request error - should return http 201')
				done()
			})
		})

		it('DELETE /pings/:id (heello.pings.delete)')

		it('POST /pings/:id/echo (heello.pings.echo)')
	})

	describe('places endpoints -', function() {
		it('POST /places/create (heello.places.create)')
	})

	describe('users endpoints -', function() {
		it('GET /users/:id/checkins (heello.users.checkins)')

		it('GET /users/:id/listen (heello.users.listen)')

		it('GET /users/me (heello.users.me)')

		it('GET /users/notifications (heello.users.notifications)')

		it('GET /users/timeline (heello.users.timeline')

		it('DELETE /users/:id/listen (heello.users.unlisten)')
	})

	describe('timeline endpoints -', function() {
		// no endpoints
	})
})
