#!/usr/bin/env node

// var watch = require('watch');
var Dropbox = require("dropbox");
var fs = require('fs');
var FlowNoRedirect = require('./auth_driver/flow_no_redirect')
var chokidar = require('chokidar');


var help = "--dropbox-key <key> --dropbox-secret <secret> --watchdir <upload>";
var argv = require('minimist')(process.argv.slice(2));
var watchdir = argv['watchdir'];
var processing = false;
var reprocess = false;
var processingFiles = [];

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
	if (error !== null) 
	{
		console.log("authenticate - [" + new Date() + "] " + error);
		process.exit(1);
	}

	var fsTimeout

	processDirectory(watchdir);

	var watcher = chokidar.watch(watchdir, 
	{
		ignored: /[\/\\]\./, persistent: true
	});

	watcher.on('add', function(f) 
	{

		console.log('add', f);

		addFileToQueue(f);
	});
});

var uploadQueue = [];
var processingQueue = false;

function processQueue(force)
{
	if (force)
	{
		processingQueue = false;
	}

	if (!processingQueue)
	{
		processingQueue = true;
		var f = uploadQueue.pop();

		if (f)
		{
			if (!fs.existsSync(f))
			{
				processQueue(true);
				return;
			}

			var stat = fs.statSync(f);

			var mtime = String(stat.mtime);

			var intervalTimer = setInterval(function()
			{
				stat = fs.statSync(f);

				var newMTime = String(stat.mtime);

				// if the mtime is the same then the file has not changed in a minute
				if (mtime == stat.mtime)
				{
					console.log('File written. Lets processes it.');
					clearInterval(intervalTimer);

					client.getAccountInfo(function(err, info, pinfo)
					{
						if (!err)
						{
							var free = pinfo.quota_info.quota - pinfo.quota_info.normal;

							console.log('Free Space: ', free);

							var filesize = getFilesizeInBytes(f);

							console.log('File Size:  ', filesize);

							if (filesize <= free)
							{
								console.log('Uploading: ', f);

								var data = fs.readFileSync(f);

								client.writeFile(f, data, function(error, stat) 
								{
									if (error !== null) 
									{
										console.log("writeFile - [" + new Date() + "] " + error);
										
										processQueue(true);
									} 
									else
									{
										console.log("Uploaded: ", f);

										if (fs.existsSync(f))
										{
											fs.unlinkSync(f)

											if (fs.existsSync(f))	
											{
												console.log('Unable to delete: ', f);
												process.exit(1);
											}
											else
											{
												console.log('Deleted: ', obj.file);
												processQueue(true);
											}
										}
									}    
								});
							}
							else
							{
								console.log('No Dropbox Space Left');
								process.exit(1);
							}
						}
						else
						{
							console.log('Dropbox error: ', err);
							processQueue(true);
						}
					});
				}
				else
				{
					console.log('File is still being written. Waiting 60 seconds.');
					mtime = String(newMTime);
				}

			}, 60000);
		}
		else
		{
			processingQueue = false;
		}

	}

}

function findFiles(files, f)
{
	for (var i = 0; i < files.length; i++)
	{
		if (files[i] == f)
		{
			return true;
		}
	}

	return false;
}

function addFileToQueue(f)
{
	console.log('Pushing file on to queue: ', f);
	uploadQueue.push(f);
	processQueue();
}

function processDirectory(dir, callback)
{
	var files = fs.readdirSync(dir);
	var filecount = -1;

	if (files)
	{
		files.forEach(function(f) 
		{
			if (f.substr(0,1) == ".") return;

			console.log('Found file: ', f);

			addFileToQueue(dir + f);
		});
	}
}

function getFilesizeInBytes(filename)
{
	var stats = fs.statSync(filename)
	var fileSizeInBytes = stats["size"]
	return fileSizeInBytes
}