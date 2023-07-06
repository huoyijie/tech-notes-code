package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func home() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Query("user")
		topics := c.Query("topics")

		// 判断用户是否存在，订阅话题是否为空
		if _, ok := myUsers[user]; !ok || len(topics) == 0 {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
			return
		}

		c.Writer.WriteString(fmt.Sprintf(`
			<!doctype html>
			<html lang="en">

			<head>
					<meta charset="UTF-8">
					<title>Server Sent Event</title>
			</head>

			<body>
			<div>Topic Messages:</div>
			<div class="event-data"></div>
			</body>

			<script src="https://code.jquery.com/jquery-1.11.1.js"></script>
			<script>
					// EventSource object of javascript listens the streaming events from our go server and prints the message.
					var stream = new EventSource("/subscribe?user=%s&topics=%s");
					stream.addEventListener("message", function(e){
							$('.event-data').append(e.data + "</br>")
					});
			</script>

			</html>`, user, topics))
	}
}