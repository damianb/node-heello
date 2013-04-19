# node-heello

node.js library for interaction with the social network [Heello](https://developer.heello.com)

## license

MIT license

## documentation

### `<Object>` heelloAPI

#### - methods

* heelloAPI.constructor(`<Object>` *params*)
	* `<Object>` *params*:
		* ***(required)*** `<String>` *appId*: heello API application id.
		* ***(required)*** `<String>` *appSecret*: heello API application secret.
		* ***(required)*** `<String>` *callbackURI*: callback URI, same one used when registering heello application.
		* `<String>` *protocol*: specify "https" or "http" for the protocol to to use for API contact. provided for testing purposes only
		* `<String>` *domain*: the domain to use for API contact. provided for testing purposes only.
		* `<String>` *userAgent*: the useragent to use when contacting the API.

* `<String>` heelloAPI.prototype.getAuthURI(`<String>` *state*)
	* **Synchronous**
	* `<String>` *state*: optional session-identifying string. reference heello oauth2 authorization documentation for more information
	* **return**: `<String>` URI to redirect user to for authentication with heello.

* heelloAPI.prototype.getTokens(`<String>` *code*, `<Callable>` *callback*)
	* Obtain refresh, access tokens using authorization_code returned by heello
	* `<String>` *code*: authorization_code obtained from heello API authentication
	* `<Callable>` *callback*: callback to invoke once token obtainment is complete

* heelloAPI.prototype.refreshTokens(`<String>` *refreshToken*, `<Callable>` *callback*)
	* Obtain new refresh, access tokens using previously obtained refresh_token (only necessary if access_token is now invalid)
	* `<String>` *refreshToken*: previously obtained refresh_token
	* `<Callable>` *callback*: callback to invoke once token obtainment is complete

#### - properties

* heelloAPI.rateLimitRemaining
	* `<integer>`: contains the number of API hits we have left before the API limit reset since the last API call. Value is `-1` until first API call.
* heelloAPI.rateLimitMax
	* `<integer>`: contains the number of API hits allowed in total before the API limit reset.  Value is `-1` until first API call.
* heelloAPI.rateLimitReset
	* `<Date>`: Date object representing when the API limit will be reset.  Value is null until first API call.
* heelloAPI.accessToken
	* `<String>`: access token currently in use
* heelloAPI.refreshToken
	* `<String>`: latest obtained refresh token

#### - magic properties

All magic properties are instances of **heelloController**.

* accounts
* checkins
* pings
* places
* timeline
* users

### `<Object>` heelloController

Each heelloController is automagically instantiated based on `lib/schema.json`. For full specification, please check with the schema.json file.

#### - magic properties

All magic properties return an executable callback created by **heelloAction**.  Reference **heelloAction** documentation for information on how to interact with **heelloAction** instances.

* **heelloController** *accounts*:
	* [*heello.accounts.update*](https://developer.heello.com/docs/1/PUT/accounts/update)

* **heelloController** *checkins*:
	* [*heello.checkins.create*](https://developer.heello.com/docs/1/POST/checkins/checkin)
	* [*heello.checkins.show*](https://developer.heello.com/docs/1/GET/checkins/show)

* **heelloController** *pings*:
	* [*heello.pings.create*](https://developer.heello.com/docs/1/POST/pings/create)
	* [*heello.pings.destroy*](https://developer.heello.com/docs/1/DELETE/pings/id)
	* [*heello.pings.echo*](https://developer.heello.com/docs/1/POST/pings/echo)
	* [*heello.pings.summary*](https://developer.heello.com/docs/1/GET/pings/pings)
	* [*heello.pings.search*](https://developer.heello.com/docs/1/GET/pings/search)
	* [*heello.pings.show*](https://developer.heello.com/docs/1/GET/pings/show)

* **heelloController** *places*:
	* [*heello.places.create*](https://developer.heello.com/docs/1/POST/places/create)
	* [*heello.places.search*](https://developer.heello.com/docs/1/GET/places/search)
	* [*heello.places.show*](https://developer.heello.com/docs/1/GET/places/show)

* **heelloController** *timeline*:
	* [*heello.timeline.public*](https://developer.heello.com/docs/1/GET/timeline/public)

* **heelloController** *users*:
	* [*heello.users.checkins*](https://developer.heello.com/docs/1/GET/users/checkins)
	* [*heello.users.listen*](https://developer.heello.com/docs/1/POST/users/listen)
	* [*heello.users.listeners*](https://developer.heello.com/docs/1/GET/users/listeners)
	* [*heello.users.listening*](https://developer.heello.com/docs/1/GET/users/listening)
	* [*heello.users.lookup*](https://developer.heello.com/docs/1/GET/users/lookup)
	* [*heello.users.me*](https://developer.heello.com/docs/1/GET/users/me)
	* [*heello.users.notifications*](https://developer.heello.com/docs/1/GET/users/notifications)
	* [*heello.users.pings*](https://developer.heello.com/docs/1/GET/users/pings)
	* [*heello.users.show*](https://developer.heello.com/docs/1/GET/users/show)
	* [*heello.users.timeline*](https://developer.heello.com/docs/1/GET/users/timeline)
	* [*heello.users.unlisten*](https://developer.heello.com/docs/1/DELETE/users/listen)

### <Object>` heelloAction

Instances of **heelloAction** are special; instead of receiving the instance yourself, you'll receive its product, a callable, to feed your parameters into for your API call.

You'll call a **heelloAction** like so:

	heello.controller.action(<Object> params, <Callable> callback)

Callbacks supplied to the heelloAction can take up to three parameters:

* `<Error>`*err*: null if no error, or Error if an error occurred during API call.
* `<Object>`*json*: JSON-parsed response from the API if provided, or null
* `<Object>`*res*: response object from npm module [superagent](https://github.com/visionmedia/superagent). inherits from node builtin http.ClientResponse.

A full example of a **heelloAction** call, assuming `heello` is your **heelloAPI** instance, is as follows:

	heello.pings.show({ id: 8188091 }, function(err, json, res) {
		if(err) throw err
		json.response // contains API response information
	})

With this call, we're looking up details for a heello ping with the ID of `8188091`.

---

## use example

	var heelloAPI = require('heello'),
		heello = new heelloAPI({
			appId: 'heello appId here',
			appSecret: 'heello appSecret here',
			callbackURI: 'http://callback.tld/',
		})

	// @note; authentication needs to happen here - obtain your tokens as per heello docs
	// reference helper methods heelloAPI.getAuthURI, heelloAPI.getTokens, heelloAPI.refreshTokens

	// heello.controller.action(<Object>params, <Callable>callback)

	// get a user's latest pings
	// (no auth)
	heello.users.pings({ id: 1234567, count: 5 }, function(err, json, res) {
		if(err) throw err
		json.response.forEach(function(ping) {
			console.log('@%s: %s [%d]', ping.user.username, ping.text, ping.id)
		})
	})

	// echo a ping
	// (needs auth)
	heello.pings.echo({ id: 1234567 }, function(err) {
		// @param <Error|null>err: null if no error, or Error if an error.
		if(err) throw err
	})

## warning

Under active development. Heello-interaction API mostly firm.

Initial obtainment of `authorization_code` is up to **$developer** unfortunately; no OOB methodology is present for obtaining an authorization_code with minimal user interaction.
See `test/authed.js` for an (ugly) example on how to do it.

## todo

* file upload support (media uploads!)
* emit warning when nearing rate limit?

## tests

Install mocha with `npm install -g mocha`, then run `npm test`.

A `test.config.json` file is necessary to run the tests as well - an example of the file is as follows:

``` json
{
	"appId":"appid",
	"appSecret":"appsecret",
	"callbackURI":"http://127.0.0.1:9009/",
	"account":{
		"username":"yourusername",
		"password":"yourpassword"
	}
}
```

When creating a test application on Heello, use the redirect URI `http://127.0.0.1:9009/` as well to allow tests to run correctly.
The testing methodology is unforgiving, unfortunately, and must work within Heello's current API rules.

Test coverage is still insufficient and expanding. Community contributions welcome.
