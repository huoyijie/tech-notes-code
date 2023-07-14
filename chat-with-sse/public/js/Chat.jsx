function Chat() {
  return (
    <div className="w-full md:w-3/5 h-4/5 mx-auto mt-5 grid grid-cols-4 md:grid-cols-8 bg-white">
      <UserList />
      <ChatBox />
    </div>
  );
}