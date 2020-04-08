const http = require('http');
const server = http.createServer();
server.on('request', (req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    res.writeHead(200, {
            'Content-Type': 'text/html'
        });
    res.write(`<!DOCTYPE html><html><head></head>
<body>
<div>
TEXT 1
TEXT 2
</div>
<div id="body">
    `);

    setTimeout(() => {
        res.write(`
AAAA
BBBB  
CCCC
DDDD
</div>
    `);
    }, 1000);
    setTimeout(() => {
        res.end(`
</body>
</html>    
    `);
    }, 2000);
});
server.listen(3030);
