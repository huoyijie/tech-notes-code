function ChatBoxMessageList() {
  const peer = React.useContext(PeerContext);
  const messages = React.useContext(MessagesContext);
  const msgList = messages.filter((msg) => msg.from === peer.username || msg.to === peer.username);

  return (
    <div className="basis-10/12 p-2">
      {msgList.map((msg) => (
      <Message key={msg.sent} msg={msg} />
      ))}
    </div>
  );
}