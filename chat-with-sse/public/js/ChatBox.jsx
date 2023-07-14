function ChatBox() {
  const peer = React.useContext(PeerContext);
  return (
    <div className="col-span-3 md:col-span-5 border rounded-e flex flex-col divide-y">
      {peer ? (
      <React.Fragment>
        <ChatBoxHeader />
        <ChatBoxMessageList />
        <ChatBoxInput />
      </React.Fragment>
      ) : (<div className="w-full h-full pt-80 text-center text-amber-600">选择一个用户开始聊天~</div>)}
    </div>
  );
}