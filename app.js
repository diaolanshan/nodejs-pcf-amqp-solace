const  restify = require('restify');

// local enviroment or cloud environment
const  port = process.env.VCAP_APP_PORT || 3000
const  ip_address = process.env.VCAP_APP_HOST || 'localhost'


var server = restify.createServer({
    name : "nodejs-pcf-amqp-solace"
});
 
var queue_name = 'nodejs-pcf-amqp-solace-queue';
 
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
// server.use(restify.plugins.CORS());

const PUB_PATH = '/amqp/solace/message/pub'
const SUB_PATH = '/amqp/solace/message/sub'
const CREATE_QUEUE = '/amqp/solace/queue'
server.get({path : PUB_PATH , version: '0.0.1'}, pub_message);
server.get({path : SUB_PATH , version: '0.0.1'}, sub_message);
server.get({path : CREATE_QUEUE , version: '0.0.1'}, create_queue);

const cfenv = require("cfenv");
const appEnv = cfenv.getAppEnv();
const basicAuth = require('basic-auth')
var url = '';
// get the service variables by name
var services = appEnv.getServices();
for (var service in services){
	if (services[service].tags.indexOf('solace-pubsub')> -1){
		var  amqpUris = services[service].credentials.amqpUris[0];
		var  clientUsername = services[service].credentials.clientUsername;
	    var  clientPassword = services[service].credentials.clientPassword;
	    var  management_host = services[service].credentials.activeManagementHostname;
	    var  management_username = services[service].credentials.managementUsername;
	    var  management_password = services[service].credentials.managementPassword;
	    var  msg_vpn = services[service].credentials.msgVpnName;
	    url = 'amqp://' + clientUsername + ":" + clientPassword + "@" + amqpUris.slice(7);
	    break;
	}
}
// Create a queue which named as nodejs-pcf-amqp-solace-queue
function create_queue(req, res, next){
	const http = require('http')
	var querystring = require('querystring');

    var contents = JSON.stringify({
        'queueName': queue_name,
        'accessType': 'non-exclusive',
        'permission': 'consume',
        'ingressEnabled': true,
        'egressEnabled': true
    });

    var options = { 
	    hostname: management_host, 
	    path: '/SEMP/v2/config/msgVpns/'+ msg_vpn +'/queues',
	    method: 'POST',   // indicate this is a POST request.
	    auth: management_username + ":" + management_password,
	    headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(contents)
      	}
	}; 

	var request = http.request(options, function(response){
	    response.setEncoding('utf8');
	    response.on('data', function (data) {
           console.log('did get data: ' + data);
        });
        response.on('end', function () {
            console.log('request complete!');
        });
        response.on('error', function (error) {
            console.log('\n Error received: ' + error);
        });
	});

	request.write(contents);
	request.end();

	res.send(200 , 'success');
	return next();
}

// Publish a message to the solace broker
function pub_message(req, res, next){
	var QueueProducer = require('./QueueProducer')
	var queueProducer = new QueueProducer().host(url).queue(queue_name);
	// send the message
	queueProducer.send('Hello world Queues!');
	res.send(200 , 'success');
	return next();
}

// Receive a message from solace.
function sub_message(req, res, next){
	var QueueConsumer = require('./QueueConsumer')
	var queueConsumer = new QueueConsumer().host(url).queue(queue_name);
	// retrieve one message
	queueConsumer.receive();
	res.send(200 , 'success');
	return next();
}

server.listen(port ,ip_address, function(){
    console.log('%s listening at %s ', server.name , server.url);
});
