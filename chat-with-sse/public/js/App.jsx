// React App
function App() {
  const [stream, setStream] = React.useState(null);
  const [users, setUsers] = React.useState(AllUsers);

  const [peer, setPeer] = React.useState(null);
  const [messages, setMessages] = React.useState([]);

  const mutContext = () => {
    return {
      setUsers: setUsers,
      setPeer: setPeer,
      setMessages: setMessages,
    };
  };

  React.useEffect(() => {
    const es = new EventSource(`/subscribe?user=${User.Username}`);
    setStream(es);

    const unsubscribe = () => {
      fetch(`/unsubscribe?user=${User.Username}`, {
        method: "GET",
      });
    }
    window.addEventListener('beforeunload', unsubscribe);

    return () => {
      window.removeEventListener('beforeunload', unsubscribe);
      es.close();
    };
  }, []);

  React.useEffect(() => {
    if (stream) {
      stream.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.kind === 'text') {
          // 收到新消息
          setMessages([...messages, message]);
        } else if (message.kind === 'online') {
          // 用户上线
          const userList = users.map((u) => {
            if (u.username === message.from) {
              u.online = true;
            }
            return u;
          });
          setUsers([...userList]);
        } else if (message.kind === 'offline') {
          // 用户下线
          const userList = users.map((u) => {
            if (u.username === message.from) {
              u.online = false;
            }
            return u;
          });
          setUsers([...userList]);
        }
      };
    }
  }, [stream, messages, users]);

  return (
    <React.StrictMode>
      <UsersContext.Provider value={users}>
        <PeerContext.Provider value={peer}>
          <MessagesContext.Provider value={messages}>
            <Header />
            <MutContext.Provider value={mutContext()}>
              <Chat />
            </MutContext.Provider>
          </MessagesContext.Provider>
        </PeerContext.Provider>
      </UsersContext.Provider>
    </React.StrictMode>
  );
}

// 定义上下文对象
const UsersContext = React.createContext([]);
const PeerContext = React.createContext(null);
const MessagesContext = React.createContext([]);
const MutContext = React.createContext({
  setUsers: null,
  setPeer: null,
});

// 挂载 React App
const app = document.querySelector('#app');
const root = ReactDOM.createRoot(app);
root.render(<App />);