# node-heello

node.js library for interaction with the social network [Heello](https://developer.heello.com)

## license

MIT license

## documentation

``` javascript
var heelloAPI = require('./lib/heello'),
	heello = new heelloAPI({
		appId: 'heello appId here',
		appSecret: 'heello appSecret here',
	})

heello.auth() // note: auth not fleshed out yet.

// heello.controller.action(<Object>params, <Callable>callback)

// get a user's latest pings
// (no auth)
heello.users.pings({ id: 1234567, count: 5 }, function(err, res) {
	if(err) throw err
	res.forEach(function(ping) {
		console.log('@%s: %s [%d]', ping.user.username, ping.text, ping.id)
	})
})

// echo a ping
// (needs auth)
heello.pings.echo({ id: 1234567 }, function(err) {
	if(err) throw err
})
```

## warning

Not safe for use, still under active development.

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
