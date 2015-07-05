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
  debug(help);
  debug("Error: Set directory to watch");
  process.exit(1);
}

if(argv['dropbox-key'] === undefined || argv['dropbox-secret'] === undefined) {
  debug(help);
  debug("Error: Set dropbox application details");
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
		debug("authenticate - [" + new Date() + "] " + error);
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

		debug('add', f);

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
		var obj = uploadQueue.pop();

		if (obj)
		{
			if (!fs.existsSync(obj.file))
			{
				processQueue(true);
				return;
			}

			var stat = fs.statSync(obj.file);

			var mtime = String(stat.mtime);

			var intervalTimer = setInterval(function()
			{
				stat = fs.statSync(obj.file);

				var newMTime = String(stat.mtime);

				// if the mtime is the same then the file has not changed in a minute
				if (mtime == stat.mtime)
				{
					debug('File written. Lets processes it.');
					clearInterval(intervalTimer);

					client.getAccountInfo(function(err, info, pinfo)
					{
						if (!err)
						{
							var free = pinfo.quota_info.quota - pinfo.quota_info.normal;

							debug('Free Space: ', free);

							var filesize = getFilesizeInBytes(obj.file);

							debug('File Size:  ', filesize);

							if (filesize <= free)
							{
								debug('Uploading: ', obj.file);

								client.writeFile(obj.file, obj.data, function(error, stat) 
								{
									if (error !== null) 
									{
										debug("writeFile - [" + new Date() + "] " + error);
										
										processQueue(true);
									} 
									else
									{
										debug("Uploaded: ", obj.file);

										if (fs.existsSync(obj.file))
										{
											fs.unlinkSync(obj.file)

											if (fs.existsSync(obj.file))	
											{
												debug('Unable to delete: ', obj.file);
												process.exit(1);
											}
											else
											{
												debug('Deleted: ', obj.file);
												processQueue(true);
											}
										}
									}    
								});
							}
							else
							{
								debug('No Dropbox Space Left');
								process.exit(1);
							}
						}
						else
						{
							debug('Dropbox error: ', err);
							processQueue(true);
						}
					});
				}
				else
				{
					debug('File is still being written. Waiting 10 seconds.');
					mtime = String(newMTime);
				}

			}, 10000);
		}
		else
		{
			processingQueue = false;
		}

	}

}

function debug(data)
{
	console.log(new Date(), data);
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
	var data = fs.readFileSync(f);

	if (data)
	{
		debug('Pushing file on to queue: ', f);
		processingFiles.push(f);
		uploadQueue.push({file: f, data: data});
		processQueue();
	}
	else
	{
		debug("readFile - [" + new Date() + "] Error");
		process.exit(1);
	}
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

			debug('Found file: ', f);

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