#!/usr/bin/env node

// var watch = require('watch');
var Dropbox = require("dropbox");
var fs = require('fs');
var FlowNoRedirect = require('./auth_driver/flow_no_redirect')
var chokidar = require('chokidar');
var http = require('http')

var help = "--dropbox-key <key> --dropbox-secret <secret> --watchdir <upload>";
var argv = require('minimist')(process.argv.slice(2));
var watchdir = argv['watchdir'];

var uploadQueue = [];
var processingQueue = false;

var htmlOutputQueue = [];
var processingOutputQueue = false;

if(watchdir === undefined)
{
	console.log(help);
	console.log("Error: Set directory to watch");
	process.exit(1);
}

if(argv['dropbox-key'] === undefined || argv['dropbox-secret'] === undefined)
{
	console.log(help);
	console.log("Error: Set dropbox application details");
	process.exit(1);
}

var client = new Dropbox.Client(
{
	key: argv['dropbox-key'],
	secret: argv['dropbox-secret']
});

var style = "<style>body{margin: 0px;padding: 0px;}img{width: 100%;height: 100%;}</style>";

client.authDriver(new FlowNoRedirect());

client.authenticate(function(error, client)
{
	if (error !== null) 
	{
		console.log("authenticate - [" + new Date() + "] " + error);
		process.exit(1);
	}

	http.createServer(function(req, response)
	{
		var canProcessQueue = true;

		htmlOutputQueue.push(startHTML);

		switch (req.url)
		{
			case "/stream":
			{
				htmlOutputQueue('<img src="http://192.168.0.20:8080" /><br>');
				htmlOutputQueue.push('<a href="/queue" />Queue</a><br>');
				htmlOutputQueue.push('<a href="/dropbox" />Dropbox</a><br>');
				htmlOutputQueue.push('<a href="/" />Home</a><br>');
				break;
			}
			case "/dropbox":
			{
				canProcessQueue = false;

				htmlOutputQueue.push('<b>Files on Dropbox:</b><br><ul>');

				client.readdir("/", function(error, entries)
				{
					if (error)
					{
						console.log(error);
						htmlOutputQueue.push(error);
					}
					else
					{
						entries.forEach(function(f) 
						{
							htmlOutputQueue.push('<li>'+ f + '</li>');
						});
					}

					htmlOutputQueue.push('</ul>');
					htmlOutputQueue.push('<a href="/stream" />Stream</a><br>');
					htmlOutputQueue.push('<a href="/queue" />Queue</a><br>');
					htmlOutputQueue.push('<a href="/" />Home</a><br>');

					htmlOutputQueue.push(endHTML);

					processOutputQueue(false, response);
				});

				break;
			}
			case "/queue":
			{
				htmlOutputQueue.push('<b>Files in queue:</b><br><ul>');

				uploadQueue.forEach(function(f) 
				{
					htmlOutputQueue.push('<li>'+ f + '</li>');
				});

				htmlOutputQueue.push('</ul>');
				htmlOutputQueue.push('<a href="/stream" />Stream</a><br>');
				htmlOutputQueue.push('<a href="/dropbox" />Dropbox</a><br>');
				htmlOutputQueue.push('<a href="/" />Home</a><br>');

				break;
			}
			default:
			{
				htmlOutputQueue.push('<a href="/stream" />Stream</a><br>');
				htmlOutputQueue.push('<a href="/queue" />Queue</a><br>');
				htmlOutputQueue.push('<a href="/dropbox" />Dropbox</a><br>');
				break;
			}
		}

		if (canProcessQueue)
		{
			htmlOutputQueue.push(endHTML);
			processOutputQueue(false, response);
		}

	}).listen(8082, function()
	{
		console.log('HTTP listening on port 8082');
	});


	var watcher = chokidar.watch(watchdir, 
	{
		ignored: /[\/\\]\./, persistent: true
	});

	watcher.on('add', function(f) 
	{
		addFileToQueue(f);
	});
});

function processOutputQueue(force, response)
{
	if (force)
	{
		processingOutputQueue = false;
	}

	if (!processingOutputQueue)
	{
		processingQueue = true;
		
		var html = htmlOutputQueue.shift();

		if (html)
		{
			if (typeof html != "function")
			{
				response.write(html);
			}
			else
			{
				html(response);
			}

			processOutputQueue(true, response);
		}
		else
		{
			processingOutputQueue = false;
		}
	}
}

function startHTML(response)
{
	response.write('<html>');
	response.write('<head>');
	response.write('<title>Raspberry Pi Surveillance Camera</title>');
	response.write(style);
	response.write('</head>');
	response.write('<body>');
}

function endHTML(response)
{
	response.end('</body></html>');
}

function processQueue(force)
{
	if (force)
	{
		processingQueue = false;
	}

	if (!processingQueue)
	{
		console.log('Processing Queue.');

		processingQueue = true;
		
		var f = uploadQueue.shift();

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
												console.log('Deleted: ', f);
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
					console.log('File is still being written. Waiting 10 seconds.');
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

function addFileToQueue(f)
{
	console.log('Pushing file on to queue: ', f);
	uploadQueue.push(f);
	processQueue();
}

function getFilesizeInBytes(filename)
{
	var stats = fs.statSync(filename)
	var fileSizeInBytes = stats["size"]
	return fileSizeInBytes
}