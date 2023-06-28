package main

import (
	"auth2-mysql-store/oauth2"
	"context"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-oauth2/mysql/v4"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"

	oa2c "golang.org/x/oauth2"

	oa2 "github.com/go-oauth2/oauth2/v4"
	"github.com/go-oauth2/oauth2/v4/errors"
	"github.com/go-oauth2/oauth2/v4/models"
	"github.com/go-oauth2/oauth2/v4/store"
)

// 统一返回包装类型
type Result struct {
	Code    string `json:"code"`
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

// 刷新 token 表单
type RefreshForm struct {
	AccessToken  string `json:"access_token" binding:"required"`
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// 模拟数据库存储，真实应用需写入数据库表中
var users = map[string]User{
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

const (
	authServerURL = "http://127.0.0.1:8080"
)

// 通过 oauth2 server 预先配置的 Client 访问 Authorization server
var config = oa2c.Config{
	ClientID:     "100000",
	ClientSecret: "575f508960a9415a97f05a070a86165b",
	Endpoint: oa2c.Endpoint{
		TokenURL: authServerURL + "/oauth/token",
	},
}

// 获取 Token & Client 存储
func getStore() (tokenStore oa2.TokenStore, clientStore *store.ClientStore) {
	tokenStore = mysql.NewDefaultStore(
		mysql.NewConfig("root:root@tcp(127.0.0.1:3306)/oauth2-db?charset=utf8"),
	)

	clientStore = store.NewClientStore()
	clientStore.Set(config.ClientID, &models.Client{
		ID:     config.ClientID,
		Secret: config.ClientSecret,
	})
	return
}

// 创建 OAuth2 授权服务器
func newAuthServer(r *gin.Engine) (as *oauth2.AuthServer) {
	tokenStore, clientStore := getStore()
	as = oauth2.NewAuthServer(tokenStore, clientStore, r)
	as.SetPasswordAuthorizationHandler(func(ctx context.Context, clientID, username, password string) (userID string, err error) {
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
	return
}

// 登录获取 token
func signin(c *gin.Context) {
	form := &SigninForm{}
	if err := c.BindJSON(form); err != nil {
		return
	}

	// 通过提供用户名、密码获取 token
	token, err := config.PasswordCredentialsToken(context.Background(), form.Username, form.Password)
	if err != nil {
		if e, ok := err.(*oa2c.RetrieveError); ok {
			c.JSON(http.StatusOK, Result{
				Code:    e.ErrorCode,
				Message: e.ErrorDescription,
			})
			return
		}
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, Result{Data: token})
}

// 刷新 Token
func refresh(c *gin.Context) {
	form := &RefreshForm{}
	if err := c.BindJSON(form); err != nil {
		return
	}

	// 自动获取新的 access and refresh token
	token, err := config.TokenSource(context.Background(), &oa2c.Token{
		AccessToken:  form.AccessToken,
		TokenType:    "Bearer",
		RefreshToken: form.RefreshToken,
		Expiry:       time.Now(),
	}).Token()

	if err != nil {
		if e, ok := err.(*oa2c.RetrieveError); ok {
			c.JSON(http.StatusOK, Result{
				Code:    e.ErrorCode,
				Message: e.ErrorDescription,
			})
			return
		}
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, Result{
		Data: token,
	})
}

func main() {
	r := gin.Default()
	as := newAuthServer(r)

	r.POST("signin", signin)

	r.POST("refresh", refresh)

	api := r.Group("api")
	{
		api.Use(as.HandleTokenVerify())
		api.GET("test", func(c *gin.Context) {
			ti, _ := c.Get(oauth2.TOKEN_KEY)
			c.JSON(http.StatusOK, Result{
				Data: ti.(oa2.TokenInfo),
			})
		})
	}

	r.Run(":8080")
}
