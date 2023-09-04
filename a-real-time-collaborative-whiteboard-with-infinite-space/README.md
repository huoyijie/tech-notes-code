# 一个有趣、支持多人实时协作、空间无限的开源白板项目 (Infinity)

一个基于 Node.js 的全栈项目，后端基于 Node.js、Mysql、Prisma (ORM)、Socket.io (MsgPack) 等技术实现。前端基于 Next.js、React、socket.io (MsgPack)、tailwindcss 等技术实现。

支持铅笔绘画、涂改笔、移动画板、滚轮或手势缩放画板、点击选中单个笔划、左键拖拽选中多个笔划、移动选中笔划、复制选中笔划、删除选中笔划、缩放选中笔划、撤销笔划、设置画笔颜色不透明度和粗细等功能。未来计划添加对图形 (Shapes) 和快捷键等功能的支持。

![infinity screenshot](https://cdn.huoyijie.cn/uploads/2023/09/infinity.gif)

## 项目地址

[github.com/huoyijie/infinity](https://github.com/huoyijie/infinity)

[在线 Demo](https://huoyijie.github.io/infinity)

## 安装后端 (backend) 项目

* 前置条件

1. Node v18.15.0+
2. npm 9.5.0+
3. Mysql server
4. git

* 克隆项目

```bash
$ cd ~/vswork
$ git clone git@github.com:huoyijie/infinity.git
```

* 安装依赖

```bash
$ cd infinity/backend
$ npm i
```

* 增加 .env 文件

```bash
$ cat <<EOF > .env
PORT=5000
DATABASE_URL="mysql://your_mysql_username:your_mysql_password@localhost:3306/infinity"
EOF
```

记得修改 `your_mysql_username` 和 `your_mysql_password`.

* 创建数据库 `infinity`

```bash
$ mysql -u your_mysql_username -p
# 输入 your_mysql_password
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 4986
Server version: 8.0.32-0ubuntu0.22.04.2 (Ubuntu)

Copyright (c) 2000, 2023, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

# 创建数据库 `infinity`
mysql> CREATE DATABASE `infinity` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
Query OK, 1 row affected (0.53 sec)

# 退出
mysql> exit
```

* 创建表

```bash
$ npx prisma db push
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "infinity" at "localhost:3306"

🚀  Your database is now in sync with your Prisma schema. Done in 545ms

✔ Generated Prisma Client (5.1.1 | library) to ./node_modules/@prisma/client in 72ms
```

* 查询数据库

```bash
mysql> use infinity
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> show tables;
+--------------------+
| Tables_in_infinity |
+--------------------+
| Drawing            |
+--------------------+
1 row in set (0.00 sec)
```

* 运行服务端

```bash
$ npm start
```

* 所有环境变量

1. HOST (default: localhost)

服务器监听 ip 地址

2. PORT (default: 5000)

服务器监听端口

3. BASE_PATH (default: /)

为了通信安全，一般需要把后端服务部署在 nginx 后面，并为 ngnix 开启 tls。比如我是这样部署的，
`wss://huoyijie.cn:1024/infinity/socket.io`，其中 `/infinity` 就是 BASE_PATH。

4. ALLOW_ORIGIN (default: *)

该项为跨域请求配置，可以这样配置 `ALLOW_ORIGIN=https://huoyijie.github.io`，只允许来自指定域的连接请求。

## 安装前端 (frontend) 项目

* 前置条件

1. Node 18.15.0+
2. npm 9.5.0+
3. git

```bash
$ cd ~/vswork
$ git clone git@github.com:huoyijie/infinity.git
```

* 安装依赖

```bash
$ cd infinity/frontend
$ npm i
```

* 增加 .env 文件

```bash
$ cat <<EOF > .env
NEXT_PUBLIC_SOCKETIO_URL=ws://your_bankend_server_domain_or_ip:your_bankend_server_port
EOF
```

记得修改 `your_bankend_server_domain_or_ip` (localhost) 和 `your_bankend_server_port` (5000).

如果服务端运行在类似 nginx 的反向代理后面，且开启了 tls，则需要把 `ws` 改为 `wss`。

* 运行前端项目

```bash
$ npm run dev
```

* 通过 Github Actions 部署 Github pages

查看 `.github/workflows/nextjs.yml`

* 所有环境变量

1. NEXT_PUBLIC_SOCKETIO_URL=ws://localhost:5000

如果服务端运行在类似 nginx 的反向代理后面，且开启了 tls，要配置 nginx 把 websocket 请求转发到后端服务器，同时需要把 `ws` 改为 `wss`。像下面这样:
`NEXT_PUBLIC_SOCKETIO_URL=wss://your_domain`。

2. NEXT_PUBLIC_BASE_PATH=/

如果后端服务器配置了 `BASH_PATH=/infinity`，则前端项目要配置 `NEXT_PUBLIC_BASE_PATH=/infinity`。