function ChatBoxInput() {
  const peer = React.useContext(PeerContext);
  const [input, setInput] = React.useState('');

  const onChange = (e) => {
    setInput(e.target.value);
  };

  const send = () => {
    // 忽略空消息
    if (input.length == 0) {
      return;
    }
    // 发送消息
    ws.send({
      kind: 'text',
      from: User.Username,
      to: peer.username,
      data: input,
      sent: new Date().getTime(),
    });
    // reset input
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  return (
    <div className="h-16 p-1">
      <div className="flex flex-row p-2">
        <input type="text" className="basis-7/8 border rounded w-full h-full bg-sky-100 p-2" value={input} onChange={onChange} onKeyDown={onKeyDown} placeholder="输入消息" />
        <span className="basis-1/8 ms-4 p-1.5">
          <button className="border-0" onClick={send}><PaperPlane /></button>
        </span>
      </div>
    </div>
  );
}