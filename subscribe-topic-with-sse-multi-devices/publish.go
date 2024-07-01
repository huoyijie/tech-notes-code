package main

import "github.com/gin-gonic/gin"

func publish(event *Event) gin.HandlerFunc {
	return func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}

		// 发布话题
		event.Message <- msg
	}
}
