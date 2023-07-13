package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.LoadHTMLGlob("templates/*")

	r.GET("join", func(c *gin.Context) {
		username := c.Query("user")
		if _, ok := users[username]; !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.HTML(http.StatusOK, "index.htm", gin.H{
			"User":  gin.H{"Username": username},
			"Users": filterUsers(username),
		})
	})

	sse := NewSSEvent()
	r.GET("subscribe", subscribe(sse))

	r.POST("send", func(c *gin.Context) {
		msg := Message{}
		if err := c.BindJSON(&msg); err != nil {
			return
		}
		sse.Message <- msg
		c.JSON(http.StatusOK, gin.H{"code": 0})
	})

	r.GET("unsubscribe", unsubscribe(sse))

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8000"
	}
	r.Run(":" + port)
}
