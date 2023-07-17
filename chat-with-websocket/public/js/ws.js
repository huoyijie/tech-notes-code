const { encode, decode } = MessagePack;

// 全局 ws
const ws = {
  conn: null,
  users: AllUsers,
  messages: [],
  connect() {
    this.conn = new WebSocket(`ws://${location.host}/ws?user=${User.Username}`);
    this.conn.onopen = function () {
      console.log('ws connected');
    };

    this.conn.onmessage = function (e) {
      const message = decode(e.data)
      console.log('Message:', message);

      if (message.kind === 'text') {
        // 收到新消息
        ws.messages.push(message);
        // 必须重新构造对象
        ws.messages = [...ws.messages];
        if (ws.notifyMessages) {
          ws.notifyMessages();
        } else {
          const intervalId = setInterval(() => {
            if (ws.notifyMessages) {
              ws.notifyMessages();
              clearInterval(intervalId);
            }
          }, 50);
        }
        return;
      }

      const updateUserStatus = (online) => {
        for (let u of ws.users) {
          if (u.username === message.from) {
            u.online = online;
            break;
          }
        }
        // 必须重新构造对象
        ws.users = [...ws.users];

        if (ws.notifyUsers) {
          ws.notifyUsers();
        } else {
          const intervalId = setInterval(() => {
            if (ws.notifyUsers) {
              ws.notifyUsers();
              clearInterval(intervalId);
            }
          }, 50);
        }
      };

      if (message.kind === 'online') {
        // 用户上线
        updateUserStatus(true);
      } else if (message.kind === 'offline') {
        // 用户下线
        updateUserStatus(false);
      }
    };

    // websocket 连接断开后自动重连
    this.conn.onclose = function (e) {
      console.log('ws disconnected and reconnect');
      ws.connect();
    };

    this.conn.onerror = function (err) {
      console.log('ws error', err);
      ws.conn.close();
    };
  },
  send(message) {
    if (this.conn) {
      this.conn.send(encode(message));
      // 添加到消息列表
      this.messages.push(message);
      if (this.notifyMessages) {
        // 必须重新构造对象
        this.messages = [...this.messages];
        this.notifyMessages();
      }
    }
  },
  hasRead() {
    if (this.notifyMessages) {
      // 必须重新构造对象
      this.messages = this.messages.map((msg) => {
        if (msg.from === u.username && !msg.read) {
          msg.read = true;
        }
        return msg;
      });
      this.notifyMessages();
    }
  },
  close() {
    if (this.conn) {
      this.conn.onclose = null;
      this.conn.close();
    }
  }
};

// 请求建立 ws 连接
ws.connect();
// 关闭页面时，同步关闭 ws 连接
window.addEventListener('beforeunload', ws.close);