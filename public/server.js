const http = require('http');
const WebSocket = require('ws');
const server = http.createServer();
const wss = new WebSocket.Server({ server });
// const wss = new WebSocket.Server({ noServer: true });  //寫法二

// Server host configuration
let ServerCongif = require('../server-config');
const Host = ServerCongif.host;  // host
const ListenPort = ServerCongif.port;  //listen Port


// ------ Websocket Server -------
wss.on('connection', function connection(ws) {
    ws.send('ws connect success');  //連線一建立就發送給 client 的訊息

    // Server 有接收到訊息時
    ws.on('message', function incoming(data) {
        // 廣播(Broadcast)給每個已連接者 (注意這裡是 wss 不是 ws)
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
});

//寫法二：當 client 想使用 WebSocket 連線時，把請求轉到 WebSocket Server
// server.on('upgrade', function upgrade(request, socket, head) {
//     wss.handleUpgrade(request, socket, head, function done(ws) {
//         wss.emit('connection', ws, request);
//     });
// });



// ------ Web Server ------ 
// client 端有請求
server.on('request', (req, res) => {
    // 前端的請求資料格式，限定用 JSON 格式
    if (req.headers['content-type'] !== 'application/json') {
        res.writeHead(403, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ status: 1, message: '資料格式請使用 JSON'}));
    }
    
    // 限定請求的 Method 及 Path
    let pathname = require('url').parse(req.url, true).pathname;
    if (req.method === 'POST' && pathname === '/getUser') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // 把 Buffer 的值轉字串
        });

        // POST 參數接收完畢後
        req.on('end', () => {
            body = JSON.parse(body);  //解晰 JSON 物件為 JS 物件
            
            //向本機的 Websocket Server 建立連線
            let conn = new WebSocket('ws://' + Host + ':' + ListenPort);
            conn.onopen = () => {
                conn.send(body.name + ',' + body.account);  //發送訊息
                conn.close();  //關閉連線
            }

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({ status: 0, message: '請求ok'}));
        });
    } else {
        res.writeHead(403, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ status: 1, message: '請求失敗，請檢查 API 及 Method 是否正確!'}));
    }
});


server.listen(ListenPort, Host, () => {
    console.log('Server running on ' + Host + ':' + ListenPort);
});