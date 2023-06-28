package oauth2

import (
	"net/http"

	"github.com/gin-gonic/gin"
	oa2 "github.com/go-oauth2/oauth2/v4"
	"github.com/go-oauth2/oauth2/v4/manage"
	"github.com/go-oauth2/oauth2/v4/server"
)

const (
	TOKEN_KEY string = "oauth2.tokenInfo"
)

type AuthServer struct {
	s *server.Server
}

// 创建 OAuth2 server
func NewAuthServer(tokenStore oa2.TokenStore, clientStore oa2.ClientStore, r *gin.Engine) *AuthServer {
	manager := manage.NewDefaultManager()
	manager.MapTokenStorage(tokenStore)
	manager.MapClientStorage(clientStore)

	s := server.NewDefaultServer(manager)

	// token endpoint
	g := r.Group("oauth")
	{
		g.POST("token", func(c *gin.Context) {
			err := s.HandleTokenRequest(c.Writer, c.Request)
			if err != nil {
				// todo: 真实应用中，需返回具体错误码给客户端
				c.AbortWithError(http.StatusBadRequest, err)
				return
			}
		})
	}

	return &AuthServer{s}
}

// Token 有效验证拦截器
func (as *AuthServer) HandleTokenVerify() gin.HandlerFunc {
	return func(c *gin.Context) {
		ti, err := as.s.ValidationBearerToken(c.Request)
		if err != nil {
			// todo: 真实应用中，需返回具体错误码给客户端，客户端根据错误码决定下一步动作(如: access_token 过期则刷新 token, refresh_token 过期则重新登录等)
			c.AbortWithError(http.StatusUnauthorized, err)
			return
		}
		c.Set(TOKEN_KEY, ti)
		c.Next()
	}
}

// OAuth Password Grant Handler
func (as *AuthServer) SetPasswordAuthorizationHandler(handler server.PasswordAuthorizationHandler) {
	as.s.PasswordAuthorizationHandler = handler
}
