package main

type User struct {
	Username string
	Online   bool
}

// todo 在线状态并发不安全
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

type Message struct {
	Kind string `json:"kind" binding:"required"`
	From string `json:"from" binding:"required"`
	To   string `json:"to,omitempty" binding:"required"`
	Sent int64  `json:"sent,omitempty" binding:"required"`
	Data string `json:"data,omitempty" binding:"required"`
}
