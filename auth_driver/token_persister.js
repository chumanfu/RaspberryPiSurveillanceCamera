var fs = require('fs');

exports.get = function(callback) {
  fs.readFile(".token", "utf-8", function(err, data){
  	var result = undefined;
  	if(data !== undefined && data !== "")
  		result = JSON.parse(data);
  	callback(err, result)
  });
}

exports.save = function(data, callback) {
  fs.writeFile(".token", JSON.stringify(data), callback);
}

