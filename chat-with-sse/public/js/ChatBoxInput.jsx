function ChatBoxInput() {
  const peer = React.useContext(PeerContext);
  const [input, setInput] = React.useState('');
  const eventSource = React.useContext(EventSourceContext);

  const onChange = (e) => {
    setInput(e.target.value);
  };

  const send = () => {
    // 忽略空消息
    if (input.length == 0) {
      return;
    }

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
    eventSource.messages.push(msg);
    if (eventSource.notifyMessages) {
      // 必须重新构造对象
      eventSource.messages = [...eventSource.messages];
      eventSource.notifyMessages();
    }
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