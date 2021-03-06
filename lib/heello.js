var EventEmitter = require('events').EventEmitter,
	urlBuilder = require('url'),
	domain = require('domain'),
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

getFingerprint = function(res) {
	if(res.protocol !== 'https') {
		return false
	}

	return res.req.connection.getPeerCertificate().fingerprint
}

const ETOKENEXPIRED = 'expired_token'
function heelloApi(options) {
	if(options === undefined)
		throw new Error('no options provided to heelloApi constructor')

	// init, build up api handlers via __defineGetter__...
	Object.keys(schema).forEach(function(controller) {
		this.__defineGetter__(controller, function() {
			return new heelloController(this, controller, schema[controller])
		}.bind(this))
	}.bind(this))

	this.conf = {
		appId: options.appId || false,
		appSecret: options.appSecret || false,
		callbackURI: options.callbackURI || false,
		protocol: options.protocol || 'https',
		domain: options.domain || 'api.heello.com',
		userAgent: options.userAgent || 'node-heello_v' + pkg.version,
		fingerprints: options.fingerprints || ['F3:97:0E:C9:35:F2:4F:8C:42:7E:BA:6A:06:4B:E9:6C:10:A0:2F:CB'],
		pinCerts: !!options.pinCerts || false,
		apiVersion: 'v1', // locking ourselves to api v1, updates will likely be necessary in the event of api changes anyways
	}
	Object.freeze(this.conf)

	this.rateLimitRemaining = -1, this.rateLimitMax = -1, this.rateLimitReset = null
	this.accessToken = null, this.refreshToken = null

	if(this.conf.appId === false || this.conf.appSecret === false || this.conf.callbackURI === false)
		throw new Error('appId, appSecret, and callbackURI must be provided')

	EventEmitter.call(this)
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
	var d = domain.create()
	d.on('error', function(err) {
		fn(err)
	})
	d.run(function() {
		var query = {
			client_id: this.conf.appId,
			client_secret: this.conf.appSecret,
			redirect_uri: this.conf.callbackURI,
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

				// certificate pinning
				var fingerprint = getFingerprint(res)
				if(fingerprint === false || this.conf.fingerprints.indexOf(fingerprint) === -1) {
					if(this.conf.pinCerts && !!fingerprint) {
						throw new Error('SECURITY: Certificate pinning failure; invalid server certificate provided')
					} else if(this.conf.pinCerts) {
						throw new Error('SECURITY: Certificate pinning failure; no encryption in use')
					} else {
						this.emit('certWarn', !!fingerprint, res)
					}
				}
				this.refreshToken = res.body.refresh_token,
				this.accessToken = res.body.access_token
				fn(null)
			}.bind(this))
	}.bind(this))
}

heelloApi.prototype._request = function(options, fn) {
	var d = domain.create()
	d.on('error', function(err) {
		fn(err)
	})
	d.run(function() {
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
			delete req.req._headers.cookie
			delete req.req._headerNames.cookie
		}

		// workaround for issue with DELETE and null-body requests: https://github.com/visionmedia/superagent/issues/236
		if(options.method === 'DELETE') {
				req.set('Content-Length', 0)
		}

		req.end(function(err, res) {
			if(err) throw err

			// certificate pinning
			var fingerprint = getFingerprint(res)
			if(fingerprint === false || this.conf.fingerprints.indexOf(fingerprint) === -1) {
				if(this.conf.pinCerts && !!fingerprint) {
					throw new Error('SECURITY: Certificate pinning failure; invalid server certificate provided')
				} else if(this.conf.pinCerts) {
					throw new Error('SECURITY: Certificate pinning failure; no encryption in use')
				} else {
					this.emit('certWarn', !!fingerprint, res)
				}
			}

			// grab rate-limit info.
			if(res.header['x-ratelimit-limit']) {
				this.rateLimitMax = res.header['x-ratelimit-limit']
				this.rateLimitRemaining = res.header['x-ratelimit-remaining']
				this.rateLimitReset = new Date(parseInt(res.header['x-ratelimit-reset']) * 1000)
			}
			if(!res.ok) {
				if(res.status === 429 || res.status === 503) {
					// No bloody idea how API limiting is being indicated currently
					// reference: https://github.com/Heello/Issues/issues/5
					this.emit('apiLimit', res.error)
					throw new Error('API limit reached')
				} else if(res.status === 401 && res.body.error === ETOKENEXPIRED) {
					throw new Error(ETOKENEXPIRED)
				} else if(res.status === 401) {
					// bad key basically, auth details rejected for some reason. emit an error.
					this.emit('apiAuthError', res.error)
					throw new Error('Authorization failure')
				} else {
					fn(res.error, null, res)
				}
			} else {
				fn(null, res.body, res)
			}
		}.bind(this))
	}.bind(this))
}

function heelloController(api, controller, actions) {
	this.api = api, this.controller = controller

	Object.keys(actions).forEach(function(action) {
		this.__defineGetter__(action, function() {
			return new heelloAction(api, controller, action, actions[action])
		})
	}.bind(this))
}

function heelloAction(api, controller, action, details) {
	this.api = api, this.controller = controller, this.action = action

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
	if(this.needsAuth) {
		this.queryParams.push('access_token')
	} else if(this.api.accessToken === null) {
		this.queryParams.push('key')
	}

	this.reqParams = this.urlParams.slice().concat(this.queryParams)

	return function(params, fn) {
		var reqParams = this.reqParams.slice(), options, d = domain.create()
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
		d.on('error', function(err) {
			fn(err)
		})
		d.run(function() {
			// sanity checks - all params we need present? do we have credentials required?

			/**
			 * if we have an access token - just use it
			 * if we do not have an access token but are using an auth-optional endpoint, use the appId.
			 * if we do not have an access token and are using an auth-required endpoint, throw error
			 */
			if(this.api.accessToken != null) {
				params['access_token'] = this.api.accessToken
			} else if(!this.needsAuth) {
				params['key'] = this.api.conf.appId
			} else {
				throw new Error(util.format('api call heelloApi.%s.%s requires authentication, none provided', this.controller, this.action))
			}

			// check to make sure all needed params are present
			Object.keys(params).forEach(function(param) {
				if(reqParams.indexOf(param) !== -1)
					reqParams.remove(reqParams.indexOf(param))
			})
			if(reqParams.length > 0)
				throw new Error(util.format('api call heelloApi.%s.%s required parameter(s) [%s] not provided', this.controller, this.action, reqParams.join(', ')))

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
					var oldToken = this.api.refreshToken
					this.api.refreshTokens(this.api.accessToken, function() {
						// emit an event to let listeners know that our tokens have changed - good for application integration
						this.api.emit('newTokens', oldToken, this.api.refreshToken)
						options.queryData['access_token'] = this.api.accessToken
						this.api._request(options, fn)
					})
				} else {
					fn(err, json, res)
				}
			}.bind(this))
		}.bind(this))
	}.bind(this)
}

module.exports = heelloApi
