var http = require('./http');

CodeForToken = {
  exchange: function(client, code, callback) {
    var url = "https://api.dropbox.com/1/oauth2/token";
    var data = {
      client_id: client._oauth._id,
      client_secret: client._oauth._secret,
      code: code, 
      grant_type: "authorization_code" };

    http.post(url, data, callback);

  }
}

module.exports = CodeForToken;