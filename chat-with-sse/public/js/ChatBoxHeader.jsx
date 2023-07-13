function ChatBoxHeader() {
  const peer = React.useContext(PeerContext);
  return (
    <div className="basis-1/12 px-2 py-4 bg-sky-50"><h1 className="text-2xl">{peer.username}</h1></div>
  );
}