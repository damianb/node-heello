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

// heello.controller.action(params, callback)
heello.users.timeline({ count: 20 }, function(err, res) {
	// err will be any errors encountered with API request - if null, no errors.
	// res will be the (parsed) JSON response from the server. on error, it may or may not be included when called.
	res.forEach(function(ping) {
		// do stuff with each ping's data here. :D
	})
})
```

## warning

Not safe for use, still under active development.
