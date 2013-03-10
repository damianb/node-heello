var EventEmitter = require('events').EventEmitter,
	fs = require('fs'),
	util = require('util'),
	querystring = require('querystring'),
	https = require('https'),
	schema = require(__dirname + 'schema.json'),
	pkg = require(__dirname + '../package.json')

function heelloApi(appId, appSecret) {
	var self = this

	// init, build up api handlers via __defineGetter__...
	Object.keys(schema).forEach(function(actions, controller) {
		self.__defineGetter__(controller, function() {
			return new heelloController(self, controller, actions)
		})
	})

	this.appId = appId
	this.appSecret = appSecret
	EventEmitter.call(self)
}
// heelloApi will inherit from EventEmitter, and will emit on severe errors (API limit, Bad Key, etc.)
util.inherits(heelloApi, EventEmitter)

heelloApi.prototype.userCreds = function() {
	// @todo writeme
}

heelloApi.prototype.request = function(method, url, queryData, fn) {
	try {
		var headers, path = url, payload = querystring.stringify(querydata)
		if(method === 'POST' || method === 'PUT') {
			headers = {
				'Accept': 'application/vnd.heello.v1',
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': payload.length,
			}
		} else {
			headers = {
				'Accept': 'application/vnd.heello.v1'
			}
			path += (payload.length > 1) ? '?' + payload : ''
		}

		req = http.request({
			hostname: 'api.heello.com',
			port: 443,
			method: method,
			path: path,
			headers: headers,
		}, function(res) {
			var response = ''
			res.setEncoding('utf8')
			res.on('data', function(chunk) {
				response += chunk
			})
			res.on('end', function() {
				if(res.statusCode !== 200) {
					// asdf
				} else {
					fn(null, response)
				}
			})
		})
		req.on('error', function(err) {
			throw err
		})
		if(method === 'POST' || method === 'PUT')
			req.write(payload)

		// set a 30sec timeout on this...
		req.setTimeout(30 * 1000, function() {
			if(req)
				req.abort()

			throw new Error('Request timed out')
		})
		req.end()
	} catch(err) {
		fn(err)
	}
}

function heelloController(api, controller, actions) {
	var self = this

	this.api = api
	this.controllerName = controller
	Object.keys(actions).forEach(function(details, action) {
		self.__defineGetter__(action, function() {
			return new heelloAction(api, controller, action, details)
		})
	})
}

function heelloAction(api, controller, action, details) {
	var self = this
	this.api = api
	this.controllerName = controller
	this.actionName = action

	// let's break it down...
	this.method = details.method || 'GET'
	this.url = (details.url) ? util.format('/%s/%s.json', controller, details.url) : '/'
	this.needsAuth = details.needsAuth || false // assume no auth needed unless stated otherwise

	// extract required URL params from this.url
	this.urlParams = []
	var re = /:([a-z0-9]+)/ig, res
	while((res = re.exec(this.url)) !== null)
		this.urlParams.push(res[1])

	this.queryParams = details.reqQueryParams || []
	this.mediaParams = details.mediaParams || null

	// automagical adding of access_token, if we need auth, this is how we get it.
	if(this.needsAuth)
		this.queryParams.push('access_token')

	this.reqParams = this.urlParams.slice().concat(this.queryParams)
}

heelloAction.prototype.send = function(params, fn) {
	var self = this, reqParams = this.reqParams.slice()
	try {
		// sanity checks
		if(self.api.creds === null)
			throw new Error(util.format('api call %s/%s requires auth, none provided', self.controllerName, self.actionName))

		// check to make sure all needed params are present
		params.forEach(function(param) {
			if(reqParams.indexOf(param) !== -1)
				delete reqParams[reqParams.indexOf(param)]
		})
		if(reqParams.length > 0)
			throw new Error(util.format('api call %s/%s missing required parameter(s) %s auth, none provided', self.controllerName, self.actionName, reqParams.join(', ')))

		var url = this.url, queryParams = {}
		// @todo check for needed query params, url params. s/:param/$paramVal/ into this.url as well.
	} catch(err) {
		fn(err)
	}
}

module.exports = heelloApi
