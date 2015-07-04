var querystring = require('querystring');
var https = require('https');
var url = require('url')

exports.post = function(target_url, data, callback) {
  var post_data = querystring.stringify(data);
  var parsed_url = url.parse(target_url);

  var post_options = {
    host: parsed_url.hostname,
    port: '443',
    path: parsed_url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
    }
  };

  var result = "";
  var post_req = https.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      result += chunk;
    });

    res.on('end', function() {
      callback(null, JSON.parse(result));
    })
  });

  post_req.write(post_data);
  post_req.end();
}