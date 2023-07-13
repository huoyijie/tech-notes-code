function Users() {
  const users = React.useContext(UsersContext);
  const peer = React.useContext(PeerContext);
  const { setPeer } = React.useContext(MutContext);

  const calcClass = (u) => {
    return (!peer || u.username !== peer.username ? 'hover:' : '') + 'bg-sky-100 hover:cursor-pointer h-24 py-4 text-center';
  };

  const onClick = (u) => {
    return () => {
      setPeer(u);
    };
  };

  return (
    <div className="basis-11/12 text-gray-500">
      {users.map((u) => (
      <div key={u.username} className={calcClass(u)} onClick={onClick(u)}>
        <img src={`public/images/${u.username}.svg`} className="mx-auto h-8 w-8 rounded-full ring-2 ring-white" />
        <strong className="text-green-600	">{u.online ? '*' : ''}</strong>
        <span>{u.username}</span>
      </div>
      ))}
      <div></div>
    </div>
  );
}