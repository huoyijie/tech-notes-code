function UserList() {
  return (
    <div className="col-span-1 border rounded-s flex flex-col divide-y">
      <div className="basis-1/12 py-4 px-5 bg-sky-50 text-center">
        <img src={`public/images/${User.Username}.svg`} className="inline-block h-12 w-12 rounded-full ring-2 ring-white" />
        <h1>{User.Username}</h1>
      </div>
      <Users />
    </div>
  );
}