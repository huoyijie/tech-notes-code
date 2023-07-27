import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(express.static('public'));
const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: false
});

io.on('connection', (socket) => {
  // 广播笔画
  socket.on('drawing', (drawing) => socket.broadcast.emit('drawing', drawing));
});

httpServer.listen(3000);
console.log('click http://localhost:3000');