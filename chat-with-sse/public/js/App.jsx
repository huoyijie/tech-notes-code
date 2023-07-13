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

const es = newEventSource();
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