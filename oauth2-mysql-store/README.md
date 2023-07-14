# 基于 mysql 实现 OAuth2 Token 持久化存储

[go-oauth2](https://github.com/go-oauth2/oauth2) 中的 TokenStore 接口是读写 Token 信息的规约，生成新 Token、验证解析 Token、刷新 Token 等都需要调用 TokenStore 中的方法，默认的 TokenStore 实现是基于内存的，重启进程后数据丢失，只适合用来开发测试。真实应用中需要持久化的存储实现，如数据库、Redis、MongoDB 等。

先来看一下 TokenStore 接口的定义:

```go
// TokenStore the token information storage interface
TokenStore interface {
	// create and store the new token information
	Create(ctx context.Context, info TokenInfo) error

	// delete the authorization code
	RemoveByCode(ctx context.Context, code string) error

	// use the access token to delete the token information
	RemoveByAccess(ctx context.Context, access string) error

	// use the refresh token to delete the token information
	RemoveByRefresh(ctx context.Context, refresh string) error

	// use the authorization code for token information data
	GetByCode(ctx context.Context, code string) (TokenInfo, error)

	// use the access token for token information data
	GetByAccess(ctx context.Context, access string) (TokenInfo, error)

	// use the refresh token for token information data
	GetByRefresh(ctx context.Context, refresh string) (TokenInfo, error)
}
```

[go-oauth2](https://github.com/go-oauth2/oauth2) 项目推荐了一些 TokenStore 的实现，其中包含了 [mysql](https://github.com/go-oauth2/mysql) 的实现，本文会基于 go-oauth2/oauth2 及 go-oauth2/mysql 实现用户登录、Token 验证和刷新等功能。

文中所有代码已放到 [Github auth2-mysql-store](https://github.com/huoyijie/tech-notes-code) 目录下。

*前置条件*
* 已安装 Go 1.20+
* 已安装 IDE （如 vscode）
* 已安装 Mysql server

## 实现授权服务器

创建新项目 auth2-mysql-store

```bash
$ mkdir auth2-mysql-store && cd auth2-mysql-store
$ go mod init auth2-mysql-store
```

新建 oauth2 package

```bash
$ mkdir oauth2
$ touch oauth2/server.go
```

编辑 oauth2/server.go 文件，添加下面代码

```go
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

// 授权服务器
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
```

上述代码定义了 AuthServer 类，内部封装了 oauth2/server.Server。

然后是 NewAuthServer 函数，传入 TokenStore 和 ClientStore 的具体实现及 Gin router `r`，内部创建了 manager 及 s 实例，添加了 oauth/token Endpoint，可接受创建和刷新 Token 的请求。

接下来为 AuthServer 类定义了 HandleTokenVerify 和 SetPasswordAuthorizationHandler 方法。前者返回一个 Token 有效验证拦截器，后者用来设置密码认证授权 Handler，可以自定义一个实现然后传入，等会儿后面可以看到。

最后，注意下 TOKEN_KEY，Token 验证有效后会使用它把解析后的 TokenInfo 写入上下文。

运行 `go mod tidy` 下载安装依赖，接下来基于 AuthServer 来实现登录认证、Token 验证和刷新等功能。

## 登录认证 & Token 验证和刷新

在项目根目录下新增 main.go 文件，添加功能相关的类和变量

```go
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

// 刷新 token 表单
type RefreshForm struct {
	AccessToken  string `json:"access_token" binding:"required"`
	RefreshToken string `json:"refresh_token" binding:"required"`
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

func decode(passwordHash string) (bytes []byte) {
	bytes, _ = base64.StdEncoding.DecodeString(passwordHash)
	return
}
```

然后添加创建 AuthServer 相关的配置和方法

```go
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
		mysql.NewConfig("[user]:[password]@tcp(127.0.0.1:3306)/oauth2-db?charset=utf8"),
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
```

上述代码是比较关键的部分，首先定义了请求授权服务器所需的 config，声明了 ClientID、ClientSecret 及 /oauth/token Endpoint，此处声明的 ClientID、ClientSecret 是授权服务器中预先配置的，下面 getStore 方法中可以看到。换句话说，授权服务器只接受预先配置的 ClientID、ClientSecret 的客户端的请求。

getStore 方法返回了 TokenStore 和 ClientStore 的具体实现，注意看构造 tokenStore 时的配置:

```go
tokenStore = mysql.NewDefaultStore(
	mysql.NewConfig("[user]:[password]@tcp(127.0.0.1:3306)/oauth2-db?charset=utf8"),
)
```

*上述 mysql 连接字符串声明了 oauth2-db 数据库，需要在启动应用前创建好，并替换数据库用户名密码。*

newAuthServer 方法里创建了 AuthServer 实例，并设置了 PasswordAuthorizationHandler。换句话说，授权服务器接受通过密码认证直接交换 Token 的请求，且通过设置的 PasswordAuthorizationHandler 回调函数来比对用户名及密码哈希。

最后添加 main 方法，实现登录认证 & Token 验证和刷新等功能:

```go
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
```

上述代码中值得注意的地方有 `api.Use(as.HandleTokenVerify())`，设置 middleware 来拦截请求并验证 Token 是否有效。还有测试接口 `/api/test`，如果 Token 无效会返回 401，Token 有效会返回解析后的 TokenInfo。

运行 `go mod tidy` 下载安装依赖，同时检查 go.mod 文件，确保 `golang.org/x/oauth2` 引用的是 `v0.9.0` 及以上版本，否则会编译报错。

然后不要忘记登录数据库管理工具，创建 oauth2-db 数据库，然后再启动应用进行测试:

```bash
# 启动应用
$ go run .
```

应用启动后会自动创建 oauth_token 表:

![oauth2_token](https://cdn.huoyijie.cn/uploads/2023/06/oauth-db.png)

接下来发送测试请求:

```bash
# 未携带 access_token 访问 /api/test 返回 401
$ curl -f http://localhost:8080/api/test
curl: (22) The requested URL returned error: 401

# 登录
$ curl -d '{"username":"huoyijie","password":"mypassword"}'  http://localhost:8080/signin
{"code":"","data":{"access_token":"YZRHM2RHZGYTMWZJNS0ZZTGXLWIYZWITYWYWOWMZOGMXMZDH","token_type":"Bearer","refresh_token":"MDHKOGMXZGITY2UWYI01ZDG5LWE1YWQTNJA0Y2E0ZJDMMTNK","expiry":"2023-06-29T12:55:07.904735395+08:00"}}
```

发送登录请求后，成功返回了 Token 信息，现在来看一下数据库表中插入的数据:

![oauth2_token table](https://cdn.huoyijie.cn/uploads/2023/06/oauth-token.png)

```bash
# 携带刚刚生成的 access_token 访问 /api/test，返回了正确解析的 TokenInfo 数据
$ curl -H 'Authorization: Bearer YZRHM2RHZGYTMWZJNS0ZZTGXLWIYZWITYWYWOWMZOGMXMZDH' http://localhost:8080/api/test
{"code":"","data":{"ClientID":"100000","UserID":"huoyijie","RedirectURI":"","Scope":"","Code":"","CodeChallenge":"","CodeChallengeMethod":"","CodeCreateAt":"0001-01-01T00:00:00Z","CodeExpiresIn":0,"Access":"YZRHM2RHZGYTMWZJNS0ZZTGXLWIYZWITYWYWOWMZOGMXMZDH","AccessCreateAt":"2023-06-29T10:55:07.86229765+08:00","AccessExpiresIn":7200000000000,"Refresh":"MDHKOGMXZGITY2UWYI01ZDG5LWE1YWQTNJA0Y2E0ZJDMMTNK","RefreshCreateAt":"2023-06-29T10:55:07.86229765+08:00","RefreshExpiresIn":604800000000000}}

# 刷新 Token，成功返回了新生成的 access_token 和 refresh_token
$ curl -d '{"access_token":"YZRHM2RHZGYTMWZJNS0ZZTGXLWIYZWITYWYWOWMZOGMXMZDH","refresh_token":"MDHKOGMXZGITY2UWYI01ZDG5LWE1YWQTNJA0Y2E0ZJDMMTNK"}' http://localhost:8080/refresh
{"code":"","data":{"access_token":"ZME5NGFLYMQTNTRMNS0ZYJG5LWEZZDKTMTHJYJHKMZC3ODQY","token_type":"Bearer","refresh_token":"ZDU4NMQYZTCTNWE2ZS01ODE1LWEWODUTYJE5ZJY2MDFLZWY2","expiry":"2023-06-29T13:08:27.799815267+08:00"}}
```

从上面的输出可以看到，携带有效的 access_token 可以访问 /api/test 测试接口，刷新 Token 接口也返回了新的 access_token 和 refresh_token。

![refresh_token_1](https://cdn.huoyijie.cn/uploads/2023/06/refresh_token_1.png)

如上图所示，刷新 Token 后，原有的 access_token & refresh_token 会被召回并失效，同时会插入新生成的 Token 数据。

oauth2_token 表的 data 字段是个 JSON 字符串，由 TokenInfo 序列化而来。

```json
{
	"ClientID": "100000",
	"UserID": "huoyijie",
	"RedirectURI": "",
	"Scope": "",
	"Code": "",
	"CodeChallenge": "",
	"CodeChallengeMethod": "",
	"CodeCreateAt": "0001-01-01T00:00:00Z",
	"CodeExpiresIn": 0,
	"Access": "ZME5NGFLYMQTNTRMNS0ZYJG5LWEZZDKTMTHJYJHKMZC3ODQY",
	"AccessCreateAt": "2023-06-29T11:08:27.526299276+08:00",
	"AccessExpiresIn": 7200000000000,
	"Refresh": "ZDU4NMQYZTCTNWE2ZS01ODE1LWEWODUTYJE5ZJY2MDFLZWY2",
	"RefreshCreateAt": "2023-06-29T10:55:07.86229765+08:00",
	"RefreshExpiresIn": 604800000000000
}
```

每隔 10 分钟会自动回收被召回的空记录，以保持表中`“干净”`的数据。换句话说，表中最后只保存有效的 Token 记录。

![refresh_token_2](https://cdn.huoyijie.cn/uploads/2023/06/refresh_token_2.png)