var readline = require('readline');
var rl = readline.createInterface(process.stdin, process.stdout);

module.exports = function(prompt, callback) {
	rl.setPrompt(prompt + '> ');
	rl.prompt();
	rl.on('line', function(line) {
		rl.close();
		callback(line);
	});
}