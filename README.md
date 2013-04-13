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

Test coverage is still insufficient and expanding. Community contributions welcome.
