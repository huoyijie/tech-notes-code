// React App
function App() {
  const [peer, setPeer] = React.useState(null);
  const users = React.useSyncExternalStore((notify) => {
    ws.notifyUsers = notify;
    return () => {
      delete ws.notifyUsers;
    };
  }, () => {
    return ws.users;
  });

  const messages = React.useSyncExternalStore((notify) => {
    ws.notifyMessages = notify;
    return () => {
      delete ws.notifyMessages;
    };
  }, () => {
    return ws.messages;
  });

  const mutContext = () => {
    return {
      setPeer: setPeer,
    };
  };

  return (
    <React.StrictMode>
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
    </React.StrictMode>
  );
}

// 定义上下文对象
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