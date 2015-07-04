#!/usr/bin/env node

var watch = require('watch');
var Dropbox = require("dropbox");
var fs = require('fs');
var FlowNoRedirect = require('./auth_driver/flow_no_redirect')

var help = "--dropbox-key <key> --dropbox-secret <secret> --watchdir <upload>";
var argv = require('minimist')(process.argv.slice(2));
var watchdir = argv['watchdir'];

if(watchdir === undefined) {
  console.log(help);
  console.log("Error: Set directory to watch");
  process.exit(1);
}

if(argv['dropbox-key'] === undefined || argv['dropbox-secret'] === undefined) {
  console.log(help);
  console.log("Error: Set dropbox application details");
  process.exit(1);
}

var client = new Dropbox.Client({
  key: argv['dropbox-key'],
  secret: argv['dropbox-secret']
});

client.authDriver(new FlowNoRedirect());

client.authenticate(function(error, client)
{
	if(error !== null) 
	{
		console.log("authenticate - [" + new Date() + "] " + error);
		process.exit(1);
	}

	watch.watchTree(watchdir, function (f, curr, prev)
	{
	    if (typeof f == "object" && prev === null && curr === null)
	    {
	      // Finished walking the tree
	    }
	    else if (prev === null)
	    {
	      // f is a new file

			console.log('NEW', f);

			fs.readFile(f, function(err, data) 
			{
				if(err !== null)
				{
					console.log("readFile - [" + new Date() + "] " + err);
					process.exit(1);
				} 

				client.writeFile(f, data, function(error, stat) 
				{
					if(error !== null) 
					{
						console.log("writeFile - [" + new Date() + "] " + error);
					} 
					else
					{
						console.log("Done");

						fs.exists(f, function(exists)
						{
							if (exists)
							{
								fs.unlink(f, function(err)
								{
									if (err)
									{
										console.log('Unable to delete', f, err);
										process.exit(1);
									}
									else
									{
										console.log('Deleted', f);
									}
								});
							}
						});
					}    
				});
			});
	    }
	    else if (curr.nlink === 0)
	    {
	      // f was removed
	      console.log('DEL', f);
	    }
	    else
	    {
	      // f was changed
	      console.log('CHANGE', f);
	    }
	});
});