var assert = require('assert'),
	path = require('path'),
	heelloAPI = require('../lib/heello'),
	pkg = require(__dirname + '/../package.json')

/**
 * This test suite requires that the test runner have their own OAuth2 credentials
 * to run the tests, storing them in /test.config.json
 */
if(!require('fs').existsSync(path.normalize(__dirname + '/../test.config.json')))
	throw new Error('A test.config.json file must be present in the root of the repository to run tests')
var testConfig = require('../test.config.json')

describe('node-heello Unauthenticated REST API -', function() {
	var heello = new heelloAPI(testConfig)

	describe('checkins endpoints -', function() {
		it('GET /checkins/:id (heello.checkins.show)', function(done) {
			heello.checkins.show({ id: 8002938 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof res.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('pings endpoints -', function() {
		// @NOTE: seems to 406 for some reason;
		// heello seems to not handle the Accept versioning header on this endpoint right
		it('GET /pings/pings (heello.pings.pings)', function(done) {
			heello.pings.pings(null, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /pings/search (heello.pings.search)', function(done) {
			heello.pings.search({ query: "heello" }, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /pings/:id (heello.pings.show)', function(done) {
			heello.pings.show({ id: 8188091 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof res.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('places endpoints -', function() {
		it('GET /places/search (heello.places.search)', function(done) {
			heello.places.search({ name: 'Starbucks', lat: 32.78411, lon: -79.93823 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /places/:id (heello.places.show)', function(done) {
			heello.places.show({ id: '322-0cab6928-e62b-4d48-a005-5199c61264d3' }, function(err, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof res.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('users endpoints -', function() {
		it('GET /users/listeners (heello.users.listeners)', function(done) {
			heello.users.listeners({ id: 'katana', username: 1 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /users/listening (heello.users.listening)', function(done) {
			heello.users.listening({ id: 'katana', username: 1 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /users/lookup (heello.users.lookup)',  function(done) {
			heello.users.lookup({ ids: 'katana', username: 1 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})

		it('GET /users/:id/pings (heello.users.pings)', function(done) {
			heello.users.pings({ id: 'katana', username: 1 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof res.response, "object", 'response should be an object')
				done()
			})
		})

		it('GET /users/:id (heello.users.show)', function(done) {
			heello.users.show({ id: 'katana', username: 1 }, function(err, res) {
				assert.ifError(err, 'request error')
				assert.equal(typeof res.response, "object", 'response should be an object')
				done()
			})
		})
	})

	describe('timeline endpoints -', function() {
		it('GET /timeline/public (heello.timeline.public)', function(done) {
			heello.timeline.public({}, function(err, res) {
				assert.ifError(err, 'request error')
				assert(res.response instanceof Array, 'response should be an array')
				done()
			})
		})
	})
})
