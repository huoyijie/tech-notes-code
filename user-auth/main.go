package main

import (
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// 统一返回包装类型
type Result struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// 注册表单
type SignupForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

// 用户模型
type User struct {
	Username, PasswordHash string
}

// 模拟数据库存储，读写 map 未加锁，不支持并发注册登录
var users = map[string]User{}

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.Writer.WriteString("Hello, world!")
	})
	r.POST("signup", func(c *gin.Context) {
		form := &SignupForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		// calc password bcrypt hash bytes
		passwordHashBytes, err := bcrypt.GenerateFromPassword([]byte(form.Password), 14)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		// base64 encode
		passwordHash := base64.StdEncoding.EncodeToString(passwordHashBytes)

		user := User{
			form.Username,
			passwordHash,
		}
		// 日志仅供调试
		fmt.Println("user:", user)

		// write new user to storage
		users[user.Username] = user
		// 日志仅供调试
		fmt.Println("users:", users)

		c.JSON(http.StatusOK, Result{
			Data: form.Username,
		})
	})
	r.Run("0.0.0.0:8080")
}
