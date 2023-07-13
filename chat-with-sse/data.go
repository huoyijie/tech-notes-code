package main

import "github.com/gin-gonic/gin"

var users = map[string]bool{
	"huoyijie": true,
	"rose":     true,
	"jack":     true,
}

func filterUsers(username string) (filterUsers []gin.H) {
	for k := range users {
		if k != username {
			filterUsers = append(filterUsers, gin.H{
				"Username": k,
				"Online":   false,
			})
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
