// React App
function App() {
  const [eventSource] = React.useState(es);
  const [peer, setPeer] = React.useState(null);
  const users = React.useSyncExternalStore((notify) => {
    eventSource.notifyUsers = notify;
    return () => {
      delete eventSource.notifyUsers;
    };
  }, () => {
    return eventSource.users;
  });

  const messages = React.useSyncExternalStore((notify) => {
    eventSource.notifyMessages = notify;
    return () => {
      delete eventSource.notifyMessages;
    };
  }, () => {
    return eventSource.messages;
  });

  React.useEffect(() => {
    // App 卸载时，取消订阅 SSE
    const unsubscribe = () => {
      fetch(`/unsubscribe?user=${User.Username}`, {
        method: "GET",
      });
    }
    window.addEventListener('beforeunload', unsubscribe);

    return () => {
      window.removeEventListener('beforeunload', unsubscribe);
      eventSource.close();
    };
  }, [eventSource]);

  const mutContext = () => {
    return {
      setPeer: setPeer,
    };
  };

  return (
    <React.StrictMode>
      <EventSourceContext.Provider value={eventSource}>
        <PeerContext.Provider value={peer}>
          <MutContext.Provider value={mutContext()}>
            <UsersContext.Provider value={users}>
              <MessagesContext.Provider value={messages}>
                <Header />
                <Chat />
              </MessagesContext.Provider>
            </UsersContext.Provider>
          </MutContext.Provider>
        </PeerContext.Provider>
      </EventSourceContext.Provider>
    </React.StrictMode>
  );
}

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
    if (es.notifyMessages) {
      // 必须重新构造对象
      es.messages = [...es.messages];
      es.notifyMessages();
    } else {
      const intervalId = setInterval(() => {
        if (es.notifyMessages) {
          // 必须重新构造对象
          es.messages = [...es.messages];
          es.notifyMessages();
          clearInterval(intervalId);
        }
      }, 50);
    }
  } else if (message.kind === 'online') {
    // 用户上线
    for (let u of es.users) {
      if (u.username === message.from) {
        u.online = true;
        break;
      }
    }
    if (es.notifyUsers) {
      // 必须重新构造对象
      es.users = [...es.users];
      es.notifyUsers();
    } else {
      const intervalId = setInterval(() => {
        if (es.notifyUsers) {
          // 必须重新构造对象
          es.users = [...es.users];
          es.notifyUsers();
          clearInterval(intervalId);
        }
      }, 50);
    }
  } else if (message.kind === 'offline') {
    // 用户下线
    for (let u of es.users) {
      if (u.username === message.from) {
        u.online = false;
        break;
      }
    }
    if (es.notifyUsers) {
      // 必须重新构造对象
      es.users = [...es.users];
      es.notifyUsers();
    } else {
      const intervalId = setInterval(() => {
        if (es.notifyUsers) {
          // 必须重新构造对象
          es.users = [...es.users];
          es.notifyUsers();
          clearInterval(intervalId);
        }
      }, 50);
    }
  }
};

// 定义上下文对象
const EventSourceContext = React.createContext(null);
const PeerContext = React.createContext(null);
const MutContext = React.createContext({
  setPeer: null,
});
const MessagesContext = React.createContext([]);
const UsersContext = React.createContext(AllUsers);

// 挂载 React App
const app = document.querySelector('#app');
const root = ReactDOM.createRoot(app);
root.render(<App />);