function UserList() {
  return (
    <div className="col-span-1 border rounded-s flex flex-col divide-y">
      <div className="basis-1/12 py-4 px-2 bg-sky-50">
        <h1 className="text-2xl text-amber-600">{User.Username}</h1>
      </div>
      <Users />
    </div>
  );
}