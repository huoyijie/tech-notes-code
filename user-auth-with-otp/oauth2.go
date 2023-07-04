package main

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-oauth2/oauth2/v4/errors"
	"github.com/go-oauth2/oauth2/v4/generates"
	"github.com/go-oauth2/oauth2/v4/manage"
	"github.com/go-oauth2/oauth2/v4/models"
	"github.com/go-oauth2/oauth2/v4/server"
	"github.com/go-oauth2/oauth2/v4/store"
	"github.com/golang-jwt/jwt"
	"github.com/pquerna/otp"
	"golang.org/x/crypto/bcrypt"
)

// 用户模型
type User struct {
	Username     string
	PasswordHash string
	OTPKey       *otp.Key
}

// 模拟数据库存储，真实应用需写入数据库表中
var users = map[string]*User{
	"huoyijie": {
		Username: "huoyijie",
		// 原始密码: mypassword
		PasswordHash: "JDJhJDE0JElHWVpnTzdtd1pZbEVTQnAyY1VhTk9CVEJkcUcwV2xyMFZaWElKZ25EZlNjM0lqZHllc2E2",
	},
}

func decode(passwordHash string) (bytes []byte) {
	bytes, _ = base64.StdEncoding.DecodeString(passwordHash)
	return
}

// 获取密钥
func getSecretKey() []byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78" /* Load key from somewhere, for example an environment variable */)
	if err != nil {
		log.Fatal(err)
	}
	return key
}

// 启动 oauth2 server
func runOAuth2(r *gin.Engine) {
	manager := manage.NewDefaultManager()
	// token memory store
	manager.MustTokenStorage(store.NewMemoryTokenStore())
	// generate jwt access token
	manager.MapAccessGenerate(generates.NewJWTAccessGenerate("jwt", getSecretKey(), jwt.SigningMethodHS512))

	// client memory store
	clientStore := store.NewClientStore()
	clientStore.Set("100000", &models.Client{
		ID:     "100000",
		Secret: "575f508960a9415a97f05a070a86165b",
	})
	manager.MapClientStorage(clientStore)

	// 设置 oauth2 server
	srv := server.NewDefaultServer(manager)

	srv.SetInternalErrorHandler(func(err error) (re *errors.Response) {
		log.Println("Internal Error:", err.Error())
		return
	})
	srv.SetResponseErrorHandler(func(re *errors.Response) {
		log.Println("Response Error:", re.Error.Error())
	})

	// 用户认证
	srv.SetPasswordAuthorizationHandler(func(ctx context.Context, clientID, username, password string) (userID string, err error) {
		if clientID == "100000" {
			// 验证用户存在且密码哈希比对成功
			if user, found := users[username]; found && bcrypt.CompareHashAndPassword(decode(user.PasswordHash), []byte(password)) == nil {
				userID = username
				return
			}
		}
		err = errors.ErrUnauthorizedClient
		return
	})

	// 返回 token
	r.POST("/oauth/token", func(c *gin.Context) {
		srv.HandleTokenRequest(c.Writer, c.Request)
	})

	// 验证 access token
	r.GET("/oauth/validate_token", func(c *gin.Context) {
		if token, err := srv.ValidationBearerToken(c.Request); err != nil {
			res := gin.H{"err_desc": err.Error()}
			switch err {
			case errors.ErrInvalidAccessToken:
				res["err_no"] = "-1001"
			case errors.ErrExpiredAccessToken:
				res["err_no"] = "-1002"
			case errors.ErrExpiredRefreshToken:
				res["err_no"] = "-1003"
			default:
				res["err_no"] = "-1000"
			}
			c.JSON(http.StatusOK, res)
		} else {
			c.JSON(http.StatusOK, gin.H{
				"err_no":    "0",
				"client_id": token.GetClientID(),
				"user_id":   token.GetUserID(),
			})
		}
	})
}
