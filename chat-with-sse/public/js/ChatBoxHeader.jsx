function ChatBoxHeader() {
  const peer = React.useContext(PeerContext);
  return (
    <div className="basis-1/12 py-4 px-6 bg-sky-50"><h1 className="text-2xl">{peer.username}</h1></div>
  );
}