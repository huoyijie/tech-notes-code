function Users() {
  const users = React.useContext(UsersContext);
  const peer = React.useContext(PeerContext);
  const { setPeer } = React.useContext(MutContext);

  const calcClass = (u) => {
    return (!peer || u.username !== peer.username ? 'hover:' : '') + 'bg-sky-100 hover:cursor-pointer h-10 p-2';
  };

  const onClick = (u) => {
    return () => {
      setPeer(u);
    };
  };

  return (
    <div className="basis-11/12 text-gray-500">
      {users.map((u) => (
      <div key={u.username} className={calcClass(u)} onClick={onClick(u)}>{u.username} {u.online ? '*' : ''}</div>
      ))}
      <div></div>
    </div>
  );
}