var Dropbox = require("dropbox");
var code_for_token = require('./code_for_token');
var console_read = require('./console_read');
var token_persister = require('./token_persister');

Dropbox.AuthDriver.FlowNoRedirect = (function() {
  function FlowNoRedirect(options) {
    this._tlsOptions = null;
    this._fs = Dropbox.Env.require('fs');
    this._http = Dropbox.Env.require('http');
    this._https = Dropbox.Env.require('https');
    this._open = Dropbox.Env.require('open');
    this._callbacks = {};
    this._nodeUrl = Dropbox.Env.require('url');
  }


  FlowNoRedirect.prototype.url = function() {
    return undefined;
  };

  FlowNoRedirect.prototype.authType = function() {
    return "code";
  };

  FlowNoRedirect.prototype.doAuthorize = function(authUrl, stateParam, client, callback) {
    //Method does too much. token_persister shouldn't be here...

    token_persister.get(function(err, token) {
      if(token !== undefined)
        return callback(token);

      console.log("1) Visit: " + authUrl);
      console.log("2) Authorise Application");
      console.log("3) Enter Code Below");

      console_read("Dropbox Code", function(code) {
        code_for_token.exchange(client, code, function(err, data) {
          token_persister.save(data, function() {
            callback(data);
          })
        })
      })   
    })

  };

  return FlowNoRedirect;

})();

module.exports = Dropbox.AuthDriver.FlowNoRedirect;