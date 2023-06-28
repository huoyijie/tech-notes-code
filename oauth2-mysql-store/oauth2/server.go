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

func NewAuthServer(tokenStore oa2.TokenStore, clientStore oa2.ClientStore, r *gin.Engine) *AuthServer {
	manager := manage.NewDefaultManager()
	manager.MapTokenStorage(tokenStore)
	manager.MapClientStorage(clientStore)

	s := server.NewDefaultServer(manager)

	g := r.Group("oauth")
	{
		g.POST("token", func(c *gin.Context) {
			err := s.HandleTokenRequest(c.Writer, c.Request)
			if err != nil {
				c.AbortWithError(http.StatusBadRequest, err)
				return
			}
		})
	}

	return &AuthServer{s}
}

func (as *AuthServer) HandleTokenVerify() gin.HandlerFunc {
	return func(c *gin.Context) {
		ti, err := as.s.ValidationBearerToken(c.Request)
		if err != nil {
			c.AbortWithError(http.StatusUnauthorized, err)
			return
		}
		c.Set(TOKEN_KEY, ti)
		c.Next()
	}
}

func (as *AuthServer) SetPasswordAuthorizationHandler(handler server.PasswordAuthorizationHandler) {
	as.s.PasswordAuthorizationHandler = handler
}
