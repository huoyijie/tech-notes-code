package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func home() gin.HandlerFunc {
	return func(c *gin.Context) {
		device := c.Query("device")
		topics := c.Query("topics")

		// 判断用户是否存在，订阅话题是否为空
		if user, ok := myDevices[device]; !ok || len(topics) == 0 {
			c.AbortWithError(http.StatusBadRequest, errors.New("bad request"))
		} else {
			c.Writer.WriteString(fmt.Sprintf(`
				<!doctype html>
				<html lang="en">
	
				<head>
						<meta charset="UTF-8">
						<title>Server Sent Event</title>
				</head>
	
				<body>
				<div>Device: %s</div>
				<div>User: %s</div>
				<br>
				<div>Topic Messages:</div>
				<div class="event-data"></div>
				</body>
	
				<script src="https://code.jquery.com/jquery-1.11.1.js"></script>
				<script>
						// EventSource object of javascript listens the streaming events from our go server and prints the message.
						var stream = new EventSource("/subscribe?device=%s&topics=%s");
						stream.addEventListener("message", function(e){
								$('.event-data').append(e.data + "</br>")
						});
				</script>
	
				</html>`, device, user, device, topics))
		}
	}
}
