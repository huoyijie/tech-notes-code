function ChatBoxInput() {
  const peer = React.useContext(PeerContext);
  const [input, setInput] = React.useState('');
  const messages = React.useContext(MessagesContext);
  const { setMessages } = React.useContext(MutContext);

  const onChange = (e) => {
    setInput(e.target.value);
  };

  const send = () => {
    const msg = {
      kind: 'text',
      from: User.Username,
      to: peer.username,
      data: input,
      sent: new Date().getTime(),
    };
    // post
    fetch("/send", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg),
    });
    // add to msglist
    setMessages([...messages, msg]);
    // reset input
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  return (
    <div className="basis-1/12 p-2">
      <div className="flex flex-row p-2">
        <input type="text" className="basis-5/6 border rounded w-full h-full bg-sky-100 p-2" value={input} onChange={onChange} onKeyDown={onKeyDown} placeholder="输入消息" />
        <button className="basis-1/6 border rounded ms-2 bg-sky-100 active:bg-sky-200" onClick={send}>发送</button>
      </div>
    </div>
  );
}