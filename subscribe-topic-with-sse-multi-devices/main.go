package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	event := NewEvent()

	r := gin.Default()
	r.GET("/", home())

	// 订阅话题消息
	r.GET("subscribe", subscribe(event))

	// 发布话题消息
	r.POST("publish", publish(event))
	r.Run(":8000")
}
