package main

import "github.com/gin-gonic/gin"

// 已注册用户，真实应用中保存在数据库中
var users = map[string]bool{
	"huoyijie": true,
	"rose":     true,
	"jack":     true,
}

// 获取不包含指定用户的列表
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

// 消息协议，目前主要有 text、online、offline 三种消息
type Message struct {
	Kind string `json:"kind" binding:"required"`
	From string `json:"from" binding:"required"`
	To   string `json:"to,omitempty" binding:"required"`
	Sent int64  `json:"sent,omitempty" binding:"required"`
	Data string `json:"data,omitempty" binding:"required"`
}
