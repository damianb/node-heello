EventEmitter = require 'events'.EventEmitter
url = require 'url'
util = require 'util'
request = require 'superagent'
schema = require __dirname + '/schema.json'
pkg = require __dirname + '../package.json'


###
Array Remove - By John Resig (MIT Licensed)
###
Array::remove = (from, to) ->
	rest = @slice (to or from) + 1 or @length
	@length = if from < 0 then @length + from else from
	return @push.apply @, rest

`const ETOKENEXPIRED = 'expired_token'`

class heelloApi extends EventEmitter
	constructor: (options) ->
		if not options then throw new Error 'no options provided to heelloApi constructor'
		for own controller, actions of schema then do (controller, actions) =>
			@__defineGetter__ controller, =>
				new heelloController @, controller, actions
		@conf =
			appId: options.appId or false
			appSecret: options.appSecret or false
			callbackURI: options.callbackURI or false,
			protocol: options.protocol or 'https',
			domain: options.domain or 'api.heello.com',
			userAgent: options.userAgent or 'node-heello_v' + pkg.version,
			apiVersion: 'v1'
		Object.freeze @conf

		@rateLimitRemaining = @rateLimitMax = -1
		@rateLimitReset = @accessToken = @refreshToken = null

		if @conf.appId is false or @conf.appSecret is false or @conf.callbackURI is false
			throw new Error 'appId, appSecret, and callbackURI must be provided'
	getAuthURI: (state) ->
		query =
			client_id: @conf.appId
			redirect_uri: @conf.callbackURI
			response_type: 'code'
		query.state = state if state?
		return url.format {
			protocol: @conf.protocol
			hostname: @conf.domain
			pathname: '/oauth/authorize'
			query: query
		}
	getTokens: (code, fn) ->
		return @_updateTokens code, 'authorization_code', fn
	refreshTokens: (code, fn) ->
		return @_updateTokens code, 'refresh_token', fn
	_updateTokens: (code, type, fn) ->
		try
			query =
				client_id: @conf.appId
				client_secret: @conf.appSecret
				redirect_uri: @conf.callbackURI
				grant_type: type
			if type is 'authorization_code'
				query.code = code
			else if type is 'refresh_token'
				query.refresh_token = code
			else
				throw new Error 'unknown token update request'

			req = request 'POST', util.format '%s://%s/oauth/token', @conf.protocol, @conf.domain
			req.set 'Accept', 'application/vnd.heello.' + @conf.apiVersion
			req.set 'User-Agent', @conf.userAgent
			req.timeout 15 * 1000
			req.type 'form'
			req.send query
			req.end (err, res) =>
				if err? then throw err
				@refreshToken = res.body.refresh_token
				@accessToken = res.body.access_token
				fn null

		catch err
			fn err
	_request: (options, fn) ->
		try
			req = request options.method or 'GET', util.format '%s://%s%s', @conf.protocol, @conf.domain, options.url
			req.set 'User-Agent', @conf.userAgent
			req.timeout 15*1000
			if options.method is 'POST' or options.method is 'PUT'
				req.type 'form'
				req.send options.queryData or {}
				#if options.media then
					# meh
			else
				req.query options.queryData or {}

			if req.req._headers.cookie?
				`// workaround for superagent bug: https://github.com/visionmedia/superagent/issues/206 `
				delete req.req._headers.cookie
				delete req.req._headerNames.cookie

			req.end (err, res) =>
				if err? then throw err
				# rate limiting
				if res.header['x-ratelimit-limit']?
					@rateLimitMax = res.header['x-ratelimit-limit']
					@rateLimitRemaining = res.header['x-ratelimit-remaining']
					@rateLimitReset = new Date parseInt res.header['x-ratelimit-reset'] * 1000

				if not res.ok
					if res.status is 429 or res.status is 503
						@emit 'apiLimit', res.error
						throw new Error 'API limit reached'
					else if res.status is 401 and res.body.error is ETOKENEXPIRED
						throw new Error ETOKENEXPIRED
					else if res.status is 401
						@emit 'apiAuthError', res.error
						throw new Error 'Authorization failure'
					else
						fn res.error, null, res
				else
					fn null, res.body, res
		catch err
			fn err

class heelloController
	constructor: (@api, @controller, actions) ->
		for own action, details of actions then do (action, details) =>
			@__defineGetter__ action, =>
				new heelloAction @, controller, action, details

class heelloAction
	constructor: (@api, @controller, @action, details) ->
		@method = details.method or 'GET'
		@url = if details.url then util.format '/%s/%s.json', controller, details.url else '/' + controller + '.json'
		@needsAuth = details.needsAuth or false
		@urlParams = []
		re = /:([a-z0-9]+)/ig
		while (res = re.exec @url) isnt null
			@urlParams.push res[1]

		@queryParams = details.reqQueryParams or []
		@mediaParams = details.mediaParams or []

		if @needsAuth then @queryParams.push 'access_token'

		@reqParams = @urlParams.slice().concat @queryParams

		return (params, fn) =>
			reqParams = @reqParams.slice()
			if typeof params is 'function'
				fn = params
				params = {}

			options =
				method: @method
				url: @url
				params: {}
				media: {}

			try
				if @api.accessToken?
					params['access_token'] = @api.accessToken
				else if not @needsAuth
					params['key'] = @api.conf.appId
				else
					throw new Error util.format 'api call heelloApi.%s.%s requires authentication, none provided', @controller, @action

				for own key, param of params then do (param) ->
					if reqParams.indexOf param isnt -1 then reqParams.remove reqParams.indexOf param
				if reqParams.length > 0
					throw new Error util.format 'api call heelloApi.%s.%s required parameter(s) [%s] not provided', @controller, @action, reqParams.join ', '

				@urlParams.forEach (p) ->
					options.url = options.url.replace ':' + p, params[p]
					delete params[p]
				@mediaParams.forEach (p) ->
					if params[p]?
						options.media[p] = params[p]
						delete params[p]

				if Object.keys(options.media).length is 0
					delete options.media

				options.queryData = params
				@api._request options, (err, json, res) =>
					if err and err.message is ETOKENEXPIRED
						@api.refreshTokens @api.refreshToken, () ->
							options.queryData['access_token'] = @api.accessToken
							@api._request options, fn
					else
						fn err, json, res
			catch err
				fn err

module.exports = heelloApi
