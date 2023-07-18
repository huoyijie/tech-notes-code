const { encode, decode } = MessagePack;

// 全局 ws
const ws = {
  conn: null,
  users: AllUsers,
  messages: [],
  // 建立 ws 连接
  connect() {
    this.conn = new WebSocket(`ws://${location.host}/ws?user=${User.Username}`);
    // ws 已连接
    this.conn.onopen = () => {
      console.log('ws connected');
    };

    // 收到 message
    this.conn.onmessage = async (e) => {
      const bytes = await e.data.arrayBuffer();
      const message = decode(bytes);
      console.log(bytes, message);

      // 收到文本消息
      if (message.kind === 'text') {
        // 收到新消息
        ws.messages.push(message);
        // 必须重新构造对象, react 才能够观察到数据变化，并重新渲染 UI
        ws.messages = [...ws.messages];
        if (ws.notifyMessages) {
          ws.notifyMessages();
        } else {
          // 如果 React App 还未初始化好，则稍后再通知数据变化
          const intervalId = setInterval(() => {
            if (ws.notifyMessages) {
              ws.notifyMessages();
              clearInterval(intervalId);
            }
          }, 50);
        }
        return;
      }

      // 更新用户列表中，用户在线状态显示
      const updateUserStatus = (online) => {
        for (let u of ws.users) {
          if (u.username === message.from) {
            u.online = online;
            break;
          }
        }
        // 必须重新构造对象, react 才能够观察到数据变化，并重新渲染 UI
        ws.users = [...ws.users];
        if (ws.notifyUsers) {
          ws.notifyUsers();
        } else {
          // 如果 React App 还未初始化好，则稍后再通知数据变化
          const intervalId = setInterval(() => {
            if (ws.notifyUsers) {
              ws.notifyUsers();
              clearInterval(intervalId);
            }
          }, 50);
        }
      };

      // 收到上下线消息
      if (message.kind === 'online') {
        // 用户上线
        updateUserStatus(true);
      } else if (message.kind === 'offline') {
        // 用户下线
        updateUserStatus(false);
      }
    };

    // websocket 连接断开后自动重连
    this.conn.onclose = (e) => {
      console.log('ws disconnected and reconnect');
      ws.connect();
    };

    // 遇到错误，关闭连接
    this.conn.onerror = (err) => {
      console.log('ws error', err);
      ws.conn.close();
    };
  },
  // 发送消息
  send(message) {
    if (this.conn) {
      const bytes = encode(message);
      console.log(message, bytes);
      this.conn.send(bytes);
      // 添加到消息列表
      this.messages.push(message);
      if (this.notifyMessages) {
        // 必须重新构造对象
        this.messages = [...this.messages];
        this.notifyMessages();
      }
    }
  },
  // 设置消息已读
  hasRead(u) {
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
  // 关闭 ws 连接
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