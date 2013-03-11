var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	request = require('superagent'),
	schema = require(__dirname + '/schema.json'),
	pkg = require(__dirname + '/../package.json')

function heelloApi(options) {
	var self = this
	if(options === undefined) options = {}

	// init, build up api handlers via __defineGetter__...
	Object.keys(schema).forEach(function(controller) {
		var actions = schema[controller]
		self.__defineGetter__(controller, function() {
			return new heelloController(self, controller, actions)
		})
	})

	this.conf = {
		appId: options.appId || false,
		appSecret: options.appSecret || false,
		domain: options.domain || 'https://api.heello.com',
		userAgent: options.userAgent || 'node-heello v' + pkg.version,
		apiVersion: 'v1',
	}
	Object.freeze(this.conf)

	this.rateLimitRemaining = -1
	this.rateLimitMax = -1
	this.rateLimitReset = null

	if(this.conf.appId === false || this.conf.appSecret === false) {
		// @todo error
	}

	EventEmitter.call(self)
}
// heelloApi will inherit from EventEmitter, and will emit on severe errors (API limit, Bad Key, etc.)
util.inherits(heelloApi, EventEmitter)

heelloApi.prototype.auth = function() {
	// @todo writeme
}

heelloApi.prototype.request = function(options, fn) {
	var self = this
	try {
		var req = request(options.method || 'GET', this.conf.domain + options.url)
		// locking ourselves to api v1, updates will likely be necessary in the event of api changes
		req.set('Accept', 'application/vnd.heello.' + this.conf.apiVersion)
			.set('User-Agent', this.conf.userAgent)
			.timeout(15 * 1000) // 15sec timeout

		if(method === 'POST' || method === 'PUT') {
			req.type('form')
				.send(options.queryData || {})

			if(options.media) {
				// @todo file upload support
			}
		} else {
			req.query(options.queryData || {})
		}

		req.end(function(err, res) {
			if(err) throw err
			// grab rate-limit info.
			if(res.header['x-ratelimit-limit']) {
				self.rateLimitMax = res.header['x-ratelimit-limit']
				self.rateLimitRemaining = res.header['x-ratelimit-remaining']
				self.rateLimitReset = new Date(parseInt(res.header['x-ratelimit-reset']) * 1000)
			}
			if(!res.ok) {
				if(res.status === 429 || res.status === 503) {
					// hoping heello will move to use HTTP 429 only for api-limited response, as per RFC 6585.
					// <https://heello.com/katana/6803710> and <https://heello.com/noah/6805308>
					self.emit('apiLimit', res.error)
					throw new Error('API limit reached')
				} else if(res.status === 401) {
					// bad key basically, auth details rejected for some reason. emit an error.
					self.emit('apiAuthError', res.error)
					throw new Error('Authorization failure')
				} else {
					throw res.error
				}
			} else {
				fn(null, res.body)
			}
		})
	} catch(err) {
		fn(err)
	}
}

function heelloController(api, controller, actions) {
	var self = this
	this.api = api, this.controllerName = controller

	Object.keys(actions).forEach(function(action) {
		var details = actions[action]
		self.__defineGetter__(action, function() {
			return new heelloAction(api, controller, action, details)
		})
	})
}

function heelloAction(api, controller, action, details) {
	var self = this
	this.api = api, this.controllerName = controller, this.actionName = action

	// let's break it down...
	this.method = details.method || 'GET'
	this.url = (details.url) ? util.format('/%s/%s.json', controller, details.url) : '/' + controller + '/'
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
	var self = this, reqParams = this.reqParams.slice(), options
	options = {
		method: this.method,
		url: this.url,
		params: {},
		media: {},
	}
	try {
		// sanity checks - all params we need present? do we have credentials required?
		if(this.needsAuth && self.api.creds === null)
			throw new Error(util.format('api call %s/%s requires auth, none provided', self.controllerName, self.actionName))

		// @todo something about grabbing our access_token, idk. fucking oauth
		// @todo include access_token anyways when we have one...? talking to heello devs about this,
		//   would help alleviate limiting when encountering users behind heavy NAT

		// check to make sure all needed params are present
		params.forEach(function(param) {
			if(reqParams.indexOf(param) !== -1)
				delete reqParams[reqParams.indexOf(param)]
		})
		if(reqParams.length > 0)
			throw new Error(util.format('api call %s/%s missing required parameter(s) %s auth, none provided', self.controllerName, self.actionName, reqParams.join(', ')))

		// start query preparations
		this.urlParams.forEach(function(p) {
			// we should expect that ALL url params are required...
			options.url = options.url.replace(':' + p, params[p])
			delete params[p]
		})
		this.mediaParams.forEach(function(p) {
			if(params[p] !== undefined) {
				media[p] = params[p]
				delete params[p]
			}
		})
		if(Object.keys(options.media).length === 0)
			delete options.media

		// load params into options, fire.
		options.queryData = params
		this.api.request(options, fn)
	} catch(err) {
		fn(err)
	}
}

module.exports = heelloApi
