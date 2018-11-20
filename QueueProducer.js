/**
 * Solace AMQP Node.js Examples: QueueProducer
 */

/* jshint node: true, esversion: 6 */

var QueueProducer = function() {
    'use strict';
    var self = {};
    // Use the amqp10 library to connect to solace.
    var AMQP = require('amqp10');
    // don't support subjects in the link names
    var amqpClient = new AMQP.Client(AMQP.Policy.merge({
        defaultSubjects : false
    }));

    // hostname in the format of 'amqp://username:password@hostname:port'
    self.host = function(hostname) {
        self.hostname = hostname;
        return self;
    };

    // queue name, should exist otherwise will return a queue not found error.
    self.queue = function(queueName) {
        self.queueName = queueName;
        return self;
    };

    self.log = function(line) {
        var time = new Date().toTimeString().split(' ')[0];
        console.log('[${time}]', line);
    };

    self.error = function(error) {
        self.log(`Error: ${JSON.stringify(error)}`);
        process.exit();
    };

    self.send = function(message) {
        self.log(`Connecting to ${self.hostname}`);
        amqpClient.connect(self.hostname).then(() => {
            // create a sender to the queue
            return amqpClient.createSender(self.queueName);
        }).then((amqpSender) => {
            self.log(`Sending message '${message}'...`);
            return amqpSender.send(message).then(() => {
                self.log('Message sent successfully.');
                self.exit();
            }, (error) => {
                self.error(error);
            });
        });
    };
    
    self.exit = function() {
        setTimeout(() => {
            amqpClient.disconnect().then(() => {
                self.log('Finished.');
                process.exit();
            });
        }, 2000); // wait for 2 seconds to exit
    };

    return self;
};

module.exports = QueueProducer

