package main

import (
	"encoding/base64"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// 统一返回包装类型
type Result struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// 登录表单
type SigninForm struct {
	Username string `json:"username" binding:"required,alphanum,max=40"`
	Password string `json:"password" binding:"required,min=8,max=40"`
}

// 用户模型
type User struct {
	Username, PasswordHash string
}

// 模拟数据库存储，真实应用需写入数据库表中
var users = map[string]User{
	"huoyijie": {
		Username: "huoyijie",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
	},
}

// 获取密钥
func getSecretKey() []byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78" /* Load key from somewhere, for example an environment variable */)
	if err != nil {
		log.Fatal(err)
	}
	return key
}

type TokenClaims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// 采用对称加密签名算法，生成 JWT Token
func generateToken(username string) (token string, err error) {
	claims := TokenClaims{
		username,
		jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			Issuer:    "user-auth-with-jwt-demo",
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, &claims)
	token, err = t.SignedString(getSecretKey())
	return
}

// token 认证拦截器
func tokenAuth(c *gin.Context) {
	auth := c.GetHeader("Authentication")
	// 未设置认证信息
	if len(auth) == 0 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	t := strings.Split(auth, " ")
	// 认证信息格式不正确，正确格式如下
	// Authentication: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imh1b3lpamllIiwiaXNzIjoidXNlci1hdXRoLXdpdGgtand0LWRlbW8iLCJleHAiOjE2ODc2MTExNDR9.CmjCuqM80vlK5RmhnQwNtB1qRp4hTkopV5QxfhdQF4o
	if len(t) != 2 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	// 解析 Token
	token, err := jwt.ParseWithClaims(t[1], &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return getSecretKey(), nil
	})

	// Token 解析出错或过期
	if err != nil || !token.Valid {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	if claims, ok := token.Claims.(*TokenClaims); !ok {
		c.AbortWithStatus(http.StatusUnauthorized)
	} else {
		// Token 认证成功，设置上下文信息
		c.Set("username", claims.Username)
	}
}

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.Writer.WriteString("Hello, world!")
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

		// 验证用户存在且密码哈希比对成功
		if user, found := users[form.Username]; !found || bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(form.Password)) != nil {
			c.JSON(http.StatusOK, Result{
				Code:    -10001,
				Message: "用户或密码错误",
			})
			return
		} else if token, err := generateToken(user.Username); err != nil {
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
	// private 接口配置了 tokenAuth 拦截器，拦截器会自动进行 Token 认证，认证成功会把 username 写入上下文中，认证失败会返回 401
	r.GET("private", tokenAuth, func(c *gin.Context) {
		username := c.GetString("username")
		c.JSON(http.StatusOK, Result{
			Data: username,
		})
	})
	r.Run("0.0.0.0:8080")
}
