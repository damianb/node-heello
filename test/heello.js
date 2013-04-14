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

describe('node-heello configuration -', function() {
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


function checkReply() {
	// asdf
}

function checkResponse() {
	// asdf
}

function checkPing() {
	// asdf
}
