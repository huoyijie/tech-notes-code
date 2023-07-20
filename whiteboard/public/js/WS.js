const { encode, decode } = MessagePack;

// 全局 ws
const WS = {
  conn: null,
  onRecvDrawings: null,
  // 建立 ws 连接
  connect() {
    this.conn = new WebSocket(`ws://${location.host}/ws?ID=${uuidv4().replaceAll('-', '')}`);
    // ws 已连接
    this.conn.onopen = () => {
      console.log('ws connected');
    };

    // 收到 drawings
    this.conn.onmessage = async (e) => {
      const bytes = await e.data.arrayBuffer();
      const drawings = decode(bytes);
      console.log(bytes, drawings);

      // 调用已注册回调函数
      if (WS.onRecvDrawings) {
        WS.onRecvDrawings(drawings);
      } else {
        // 如果 React App 还未初始化好，则稍后再处理
        const intervalId = setInterval(() => {
          if (WS.onRecvDrawings) {
            WS.onRecvDrawings(drawings);
            clearInterval(intervalId);
          }
        }, 50);
      }
    };

    // websocket 连接断开后自动重连
    this.conn.onclose = (e) => {
      console.log('ws disconnected and reconnect');
      WS.connect();
    };

    // 遇到错误，关闭连接
    this.conn.onerror = (err) => {
      console.log('ws error', err);
      WS.conn.close();
    };
  },
  // 发送 drawings
  send(drawings) {
    if (this.conn) {
      const bytes = encode(drawings);
      console.log(drawings, bytes);
      this.conn.send(bytes);
    }
  },
  // 关闭 ws 连接
  close() {
    if (this.conn) {
      this.conn.onclose = null;
      this.conn.close();
    }
  }
};

// 请求建立 ws 连接
WS.connect();
// 关闭页面时，同步关闭 ws 连接
window.addEventListener('beforeunload', WS.close);