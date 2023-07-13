function Message({msg}) {
  const peer = React.useContext(PeerContext);

  const calcClass = () => {
    return (msg.to === peer.username ? 'bg-sky-200 ml-auto rounded-s-xl' : 'bg-slate-100 rounded-e-xl') + ' border px-2 py-1';
  };
  return (
    <div className="m-4 flex flex-row">
      <span className={calcClass()}>{msg.data}</span>
    </div>
  );
}