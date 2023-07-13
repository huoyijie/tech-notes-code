function newEventSource() {
  // 订阅 SSE
  const es = new EventSource(`/subscribe?user=${User.Username}`);
  // 初始化用户和消息列表
  es.users = AllUsers;
  es.messages = [];
  es.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    console.log(data);

    if (message.kind === 'text') {
      // 收到新消息
      es.messages.push(message);
      // 必须重新构造对象
      es.messages = [...es.messages];
      if (es.notifyMessages) {
        es.notifyMessages();
      } else {
        const intervalId = setInterval(() => {
          if (es.notifyMessages) {
            es.notifyMessages();
            clearInterval(intervalId);
          }
        }, 50);
      }
      return;
    }

    const updateUserStatus = (online) => {
      for (let u of es.users) {
        if (u.username === message.from) {
          u.online = online;
          break;
        }
      }
      // 必须重新构造对象
      es.users = [...es.users];

      if (es.notifyUsers) {
        es.notifyUsers();
      } else {
        const intervalId = setInterval(() => {
          if (es.notifyUsers) {
            es.notifyUsers();
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
  return es;
}