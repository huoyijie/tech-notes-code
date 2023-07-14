function Users() {
  const eventSource = React.useContext(EventSourceContext);
  const users = React.useContext(UsersContext);
  const peer = React.useContext(PeerContext);
  const { setPeer } = React.useContext(MutContext);

  const messages = React.useContext(MessagesContext);
  const unReadMsgCount = (u) => messages.filter((msg) => msg.from === u.username && !msg.read).length;
  const unReadMsg = (u) => {
    // 只有在没有打开与某人的聊天对话框时才显示未读消息
    if (!peer || u.username !== peer.username) {
      const count = unReadMsgCount(u);
      if (count > 0) {
        return (
          <strong className="text-red-600">{` (${count})`}</strong>
        );
      }
    }
  };

  const calcClass = (u) => {
    return (!peer || u.username !== peer.username ? 'hover:' : '') + 'bg-sky-100 hover:cursor-pointer h-24 py-4 text-center';
  };

  const onClick = (u) => {
    return () => {
      setPeer(u);
      // 计算发给我的未读消息数量
      if (unReadMsgCount(u) > 0) {
        // 设置消息已读
        if (eventSource.notifyMessages) {
          // 必须重新构造对象
          eventSource.messages = eventSource.messages.map((msg) => {
            if (msg.from === u.username && !msg.read) {
              msg.read = true;
            }
            return msg;
          });
          eventSource.notifyMessages();
        }
      }
    };
  };

  return (
    <div className="text-gray-500">
      {users.map((u) => (
      <div key={u.username} className={calcClass(u)} onClick={onClick(u)}>
        <img src={`public/images/${u.username}.svg`} className="mx-auto h-8 w-8 rounded-full ring-2 ring-white" />
        <strong className="text-green-600	">{u.online ? '* ' : ''}</strong>
        <span>{u.username}</span>
        {unReadMsg(u)}
      </div>
      ))}
      <div></div>
    </div>
  );
}