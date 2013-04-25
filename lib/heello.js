var EventEmitter = require('events').EventEmitter,
	urlBuilder = require('url'),
	util = require('util'),
	request = require('superagent'),
	schema = require(__dirname + '/schema.json'),
	pkg = require(__dirname + '/../package.json')

/**
 * [utility function, ignore]
 *
 * Array Remove - By John Resig (MIT Licensed)
 */
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length)
	this.length = from < 0 ? this.length + from : from
	return this.push.apply(this, rest)
}

const ETOKENEXPIRED = 'expired_token'
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
		callbackURI: options.callbackURI || false,
		protocol: options.protocol || 'https',
		domain: options.domain || 'api.heello.com',
		userAgent: options.userAgent || 'node-heello_v' + pkg.version,
		apiVersion: 'v1', // locking ourselves to api v1, updates will likely be necessary in the event of api changes anyways
	}
	Object.freeze(this.conf)

	this.rateLimitRemaining = -1, this.rateLimitMax = -1, this.rateLimitReset = null
	this.accessToken = null, this.refreshToken = null

	if(this.conf.appId === false || this.conf.appSecret === false || this.conf.callbackURI === false)
		throw new Error('appId, appSecret, and callbackURI must be provided')

	EventEmitter.call(self)
}
// heelloApi will inherit from EventEmitter, and will emit on severe errors (API limit, Bad Key, etc.)
util.inherits(heelloApi, EventEmitter)

heelloApi.prototype.getAuthURI = function(state) {
	var query = {
		client_id: this.conf.appId,
		redirect_uri: this.conf.callbackURI,
		response_type: 'code',
	}
	if(state !== undefined && state !== null)
		query.state = state

	return urlBuilder.format({
		protocol: this.conf.protocol,
		hostname: this.conf.domain,
		pathname: '/oauth/authorize',
		query: query
	})
}

heelloApi.prototype.getTokens = function(code, fn) {
	this._updateTokens(code, 'authorization_code', fn)
}

heelloApi.prototype.refreshTokens = function(refreshToken, fn) {
	this._updateTokens(refreshToken, 'refresh_token', fn)
}

heelloApi.prototype._updateTokens = function(code, type, fn) {
	var self = this
	try {
		var query = {
			client_id: this.conf.appId,
			client_secret: this.conf.appSecret,
			redirect_uri: this.conf.callbackURI,
			code: this.code,
			grant_type: type,
		}

		if(type === 'authorization_code') {
			query['code'] = code
		} else if(type === 'refresh_token') {
			query['refresh_token'] = code
		} else {
			throw new Error('unknown token update request')
		}

		var req = request('POST', this.conf.protocol + '://' + this.conf.domain + '/oauth/token')

		req.set('Accept', 'application/vnd.heello.' + this.conf.apiVersion)
			.set('User-Agent', this.conf.userAgent)
			.timeout(15 * 1000) // 15sec timeout
			.type('form')
			.send(query)
			.end(function(err, res) {
				if(err) throw err
				self.refreshToken = res.body.refresh_token,
				self.accessToken = res.body.access_token
				fn(null)
			})
	} catch(err) {
		fn(err)
	}
}

heelloApi.prototype._request = function(options, fn) {
	var self = this
	try {
		var req = request(options.method || 'GET', this.conf.protocol + '://' + this.conf.domain + options.url)
		req.set('Accept', 'application/vnd.heello.' + this.conf.apiVersion)
			.set('User-Agent', this.conf.userAgent)
			.timeout(15 * 1000) // 15sec timeout

		if(options.method === 'POST' || options.method === 'PUT') {
			req.type('form')
				.send(options.queryData || {})

			if(options.media) {
				// @todo file upload support
				// maybe when I'm not so aggravated by oauth2 docs
			}
		} else {
			req.query(options.queryData || {})
		}

		// workaround for superagent bug: https://github.com/visionmedia/superagent/issues/206
		if(!req.req._headers.cookie) {
			delete req.req._headers.cookie;
			delete req.req._headerNames.cookie;
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
				} else if(res.status === 401 && res.body.error === ETOKENEXPIRED) {
					throw new Error(ETOKENEXPIRED)
				} else if(res.status === 401) {
					// bad key basically, auth details rejected for some reason. emit an error.
					self.emit('apiAuthError', res.error)
					throw new Error('Authorization failure')
				} else {
					//throw res.error
					fn(res.error, null, res)
				}
			} else {
				fn(null, (res.body) ? res.body : null, res)
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
	this.url = (details.url) ? util.format('/%s/%s.json', controller, details.url) : '/' + controller + '.json'
	this.needsAuth = details.needsAuth || false // assume no auth needed unless stated otherwise

	// extract required URL params from this.url
	this.urlParams = []
	var re = /:([a-z0-9]+)/ig, res
	while((res = re.exec(this.url)) !== null)
		this.urlParams.push(res[1])

	this.queryParams = details.reqQueryParams || []
	this.mediaParams = details.mediaParams || []

	// automagical adding of access_token, if we need auth, this is how we get it.
	if(this.needsAuth)
		this.queryParams.push('access_token')

	this.reqParams = this.urlParams.slice().concat(this.queryParams)

	var ret = function(params, fn) {
		var reqParams = this.reqParams.slice(), options
		// no params? shift it over.
		if(typeof params === 'function') {
			fn = params
			params = {}
		}
		options = {
			method: this.method,
			url: this.url,
			params: {},
			media: {},
		}
		try {
			// sanity checks - all params we need present? do we have credentials required?

			/**
			 * if we have an access token - just use it
			 * if we do not have an access token but are using an auth-optional endpoint, use the appId.
			 * if we do not have an access token and are using an auth-required endpoint, throw error
			 */
			if(this.api.accessToken !== null) {
				params['access_token'] = this.api.accessToken
			} else if(!this.needsAuth) {
				params['key'] = this.api.conf.appId
			} else {
				throw new Error(util.format('api call heelloApi.%s.%s requires authentication, none provided', this.controllerName, this.actionName))
			}

			// check to make sure all needed params are present
			Object.keys(params).forEach(function(param) {
				if(reqParams.indexOf(param) !== -1)
					reqParams.remove(reqParams.indexOf(param))
			})
			if(reqParams.length > 0)
				throw new Error(util.format('api call heelloApi.%s.%s required parameter(s) [%s], none provided', this.controllerName, this.actionName, reqParams.join(', ')))

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
			this.api._request(options, function(err, json, res) {
				if(err && err.message === ETOKENEXPIRED) {
					// swap out with new token, try again pls
					this.api.refreshTokens(function() {
						options.queryData['access_token'] = this.api.accessToken
						this.api._request(options, fn)
					})
				} else {
					fn(err, json, res)
				}
			}.bind(this))
		} catch(err) {
			fn(err)
		}
	}

	return ret.bind(this)
}

module.exports = heelloApi
