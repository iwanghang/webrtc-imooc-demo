'use strict'

var log4js = require('log4js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var socketIo = require('socket.io');
var express = require('express');
var serveIndex = require('serve-index');
var tls = require('tls');
var constains=require( 'constants');

var USERCOUNT = 3;

log4js.configure({
    appenders: {
        file: {
            type: 'file',
            filename: 'app.log',
            layout: {
                type: 'pattern',
                pattern: '%r %p - %m',
            }
        }
    },
    categories: {
       default: {
          appenders: ['file'],
          level: 'debug'
       }
    }
});

var logger = log4js.getLogger();

var app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));



//http server
var http_server = http.createServer(app);
http_server.listen(80, '0.0.0.0');

var options = {
	key : fs.readFileSync('./cert/www.iaiia.site.key'),
	cert: fs.readFileSync('./cert/www.iaiia.site_bundle.pem')
}

var tls_options = {
	key : fs.readFileSync('./cert/www.iaiia.site.key'),
	cert: fs.readFileSync('./cert/www.iaiia.site_bundle.pem'),
	secureOptions: constains.SSL_OP_NO_TLSv1_2 | constains.SSL_OP_NO_TLSv1_1
}

//https server
var https_server = https.createServer(options, app);
var io = socketIo.listen(https_server);
//var io = socketIo.listen(http_server);

io.sockets.on('connection', (socket)=> {

	socket.on('message', (room, data)=>{
		socket.to(room).emit('message',room, data);
	});

	socket.on('join', (room)=>{
		socket.join(room);
		var myRoom = io.sockets.adapter.rooms[room]; 
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.debug('the user number of room is: ' + users);

		if(users < USERCOUNT){
			socket.emit('joined', room, socket.id); //发给除自己之外的房间内的所有人
			if(users > 1){
				socket.to(room).emit('otherjoin', room, socket.id);
			}
		
		}else{
			socket.leave(room);	
			socket.emit('full', room, socket.id);
		}
		//socket.emit('joined', room, socket.id); //发给自己
		//socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
		//io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
	});

	socket.on('leave', (room)=>{
		var myRoom = io.sockets.adapter.rooms[room]; 
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.debug('the user number of room is: ' + (users-1));
		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved', room, socket.id);
	});

});

https_server.listen(443, '0.0.0.0');

var tls_server = tls.createServer(tls_options, function(test) {
        console.log('server connected', test.authorized ? 'authorized' : 'unauthorized');
        test.write("welcome!\n");
        test.setEncoding('utf8');
        test.on('data', function(data) {
                console.log(data);
        });
        test.on('close', function() {
                console.log('client has closed');
                server.close();
        });
});
tls_server.listen(444, function() {
        console.log('server bound');
});

