package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// 统一返回包装类型
type Result struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
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

// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

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

		// check username unique
		if _, found := users[form.Username]; found {
			c.JSON(http.StatusOK, Result{
				Code:    -10000,
				Message: "用户已存在",
			})
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
	r.POST("signin", func(c *gin.Context) {
		form := &SigninForm{}
		if err := c.BindJSON(form); err != nil {
			return
		}

		decode := func(passwordHash string) (bytes []byte) {
			bytes, _ = base64.StdEncoding.DecodeString(passwordHash)
			return
		}

		if user, found := users[form.Username]; !found || bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(form.Password)) != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10001,
				Message: "用户或密码错误",
			})
			return
		} else if token, err := GenerateToken(user.Username); err != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10002,
				Message: "生成 Token 失败",
			})
			return
		} else {
			c.JSON(http.StatusOK, Result{
				Data: token,
			})
		}
	})

	g := r.Group("", func(c *gin.Context) {
		// 实现拦截器
		auth := c.GetHeader("Authentication")
		// 未设置认证信息
		if len(auth) == 0 {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		t := strings.Split(auth, " ")
		// 认证信息格式不正确，正确格式如下
		// Authentication: Bearer eL8TZSnTs4LS/UR9cmw7n6oW3K7TVMg35IxDZWozKS+dNbqAYov09kVuoG0=
		if len(t) != 2 {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		token := t[1]
		if username, expired, err := ParseToken(token); err != nil {
			// Token 解析出错
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		} else if expired {
			// token 过期，需要重新登录
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		} else {
			// Token 认证成功，设置上下文信息
			c.Set("username", username)
		}
	})
	g.GET("private", func(c *gin.Context) {
		username := c.GetString("username")
		c.JSON(http.StatusOK, Result{
			Data: username,
		})
	})

	r.Run("0.0.0.0:8080")
}
