package main

type User struct {
	Username string
	Online   bool
}

var users = map[string]*User{
	"huoyijie": {"huoyijie", false},
	"rose":     {"rose", false},
	"jack":     {"jack", false},
}

func filterUsers(username string) (filterUsers []User) {
	for k, v := range users {
		if k != username {
			filterUsers = append(filterUsers, *v)
		}
	}
	return
}
