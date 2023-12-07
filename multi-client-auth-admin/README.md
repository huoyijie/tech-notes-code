## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Todo

菜单改成双重循环显示
前后端公共代码放到单独 npm 模块
集成一个好用的文档模块，渲染 API 用例，以及 Docs
后端校验 access_token 返回 401，外加 access_token 是否过期，refresh_token 是否过期信息，前端根据情况选择刷新 token，还是重新登录
zIndex 蒙层读取 theme 中值，然后自动生成
统一配置 onError，遇到 401 刷新token或重新登录
优化 Error 信息显示
"Failed to fetch": "服务器异常" messages.json 测试