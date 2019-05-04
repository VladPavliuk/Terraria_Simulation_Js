let app = require('http').createServer(handler);
let io = require('socket.io')(app);
let fs = require('fs');
let terraria = require('./terraria');

app.listen(process.env.PORT || 8000);

function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
}

io.on('connection', function (socket) {
    setInterval(() => {
        socket.emit('data', terraria.data);
    }, 50);
});