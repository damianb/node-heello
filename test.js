var url = require('url'), path = require('path'), fs = require('fs'), port = parseInt(process.argv[2] || 8888, 10)
require('http').createServer(function(req, res) {
    console.dir(req)
	console.dir(url.parse(req.url))
	res.writeHead(200, {
		'Content-Type': 'application/json',
		'X-RateLimit-Limit': 350,
		'X-RateLimit-Remaining': 250,
	})
	res.write(fs.readFileSync('response.json'))
	res.end()
}).listen(port, function() { console.log("test server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown") })

// doing a test...
setTimeout(function() {
	var heelloAPI = require('./lib/heello'),
		heello = new heelloAPI({
			appId: '1',
			appSecret: '1',
			domain: 'http://localhost:' + port,
		})

	heello.users.pings({ id: 'katana', username: 1, count: 5 }, function(err, res) {
		if(err) console.dir(err.stack)
		console.dir(res)
	})

	console.dir(heello)
}, 1 * 1000)
