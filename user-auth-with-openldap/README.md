<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/video.js@8.0.4/dist/video-js.min.css">
<script src="https://cdn.jsdelivr.net/npm/video.js@8.0.4/dist/video.min.js"></script>
<script>
    window.HELP_IMPROVE_VIDEOJS = false
</script>

# 基于 OpenLDAP、React、MUI组件库、Next.js、Serverless 等技术实现一个管理后台模板（一）

## Github 地址

[代码地址](https://github.com/huoyijie/tech-notes-code/tree/master/user-auth-with-openldap)

[在线体验 Demo](https://ldap-auth.vercel.app/)
用户名: huoyijie
密码:123456

![Sign in](https://cdn.huoyijie.cn/uploads/2023/12/signin.png)

![Dashboard](https://cdn.huoyijie.cn/uploads/2023/12/dashboard.png)

<br><video id="video-1" class="video-js" controls muted preload="auto" width="720" data-setup="{}">
  <source src="https://cdn.huoyijie.cn/uploads/2023/12/react-admin.webm" type="video/webm">
</video><br>

## Next.js 介绍

[Next.js](https://nextjs.org/) 是一个用于构建现代 React 应用程序的流行开源框架。它提供了一组强大的工具和约定，使得 React 应用的开发变得更加简单和高效。

## MUI 介绍

[Material-UI](https://mui.com/) 是一个基于 React 的流行开源组件库，用于构建符合 [Google Material Design](https://m3.material.io/) 规范的用户界面。MUI 提供了一套丰富而灵活的 React 组件，使开发人员能够轻松创建具有现代外观和交互的 Web 应用程序。这个库提供了各种组件，包括按钮、表单、导航、对话框等，这些组件遵循 Material Design 的设计原则。

## LDAP/OpenLDAP 介绍

LDAP（轻量目录访问协议，Lightweight Directory Access Protocol）是一种用于访问和维护分布式目录信息服务的协议。LDAP 最初设计用于提供一种轻量级的、低开销的访问目录信息的方法。目录服务是一种特殊的数据库，用于存储和检索组织中的信息，例如用户、计算机、组织单元等。LDAP 在企业网络中广泛应用，可用来实现统一身份认证，让用户在多个服务中使用相同的身份和密码，也常常配合企业内部实现单点登录(SSO)。

[OpenLDAP](https://www.openldap.org/) 是一个开源的 LDAP 实现，而 Microsoft Active Directory（AD）是一个广泛使用的 LDAP 目录服务的实例，用于 Windows 环境中的身份认证和目录服务。

录入用户信息时，还是会写入数据库中，同时导出一份数据写入 openLDAP 中，并保持数据随时同步。后面系统进行用户认证时，直接与 openLDAP 交互即可。

## 安装配置 OpenLDAP

```bash
# Ubuntu 22.04
$ sudo apt install slapd
$ sudp apt install ldap-utils
```

进行初始设置，注意会提示设置管理员密码，后面管理和程序连接时会用到。

```bash
$ sudo dpkg-reconfigure slapd
```

设定域

![ldap-1](https://cdn.huoyijie.cn/uploads/2023/12/ldap-1.png)

设定组织名称

![ldap-2](https://cdn.huoyijie.cn/uploads/2023/12/ldap-2.png)

设定管理员密码

![ldap-3](https://cdn.huoyijie.cn/uploads/2023/12/ldap-3.png)

检查 openldap 已正常运行
```bash
$ ldapsearch -x -LLL -D cn=admin,dc=huoyijie,dc=cn -W -b dc=huoyijie,dc=cn
Enter LDAP Password: ******
dn: dc=huoyijie,dc=cn
objectClass: top
objectClass: dcObject
objectClass: organization
o: huoyijie
dc: huoyijie
```

添加测试用户，创建一个 user.ldif 文件，编辑内容:
```bash
# 添加 users 组
dn: ou=users,dc=huoyijie,dc=cn
objectClass: organizationalUnit
objectClass: top
ou: users

# 添加用户 huoyijie
dn: uid=huoyijie,ou=users,dc=huoyijie,dc=cn
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: huoyijie
cn: Yijie Huo
sn: Huo
userPassword: 123456
mail: huoyijie@huoyijie.cn
```

运行 ldapadd 命令
```bash
$ ldapadd -x -D "cn=admin,dc=huoyijie,dc=cn" -W -f user.ldif
Enter LDAP Password: 
adding new entry "ou=users,dc=huoyijie,dc=cn"

adding new entry "uid=huoyijie,ou=users,dc=huoyijie,dc=cn"
```

* -x: 使用简单身份验证。
* -D: 指定用于绑定到 LDAP 服务器的管理员 DN。
* -W: 提示输入管理员密码
* -f: 指定包含 LDIF 数据的文件

在执行该命令后，系统将提示输入管理员密码，然后将 LDIF 文件中的用户数据添加到 LDAP 中。

查询验证新用户
```bash
$ ldapsearch -x -D "cn=admin,dc=huoyijie,dc=cn" -W -b "ou=users,dc=huoyijie,dc=cn" "(uid=huoyijie)"
Enter LDAP Password: 
# extended LDIF
#
# LDAPv3
# base <ou=users,dc=huoyijie,dc=cn> with scope subtree
# filter: (uid=huoyijie)
# requesting: ALL
#

# huoyijie, users, huoyijie.cn
dn: uid=huoyijie,ou=users,dc=huoyijie,dc=cn
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: huoyijie
cn: Yijie Huo
sn: Huo
userPassword:: MTIzNDU2
mail: huoyijie@huoyijie.cn

# search result
search: 2
result: 0 Success

# numResponses: 2
# numEntries: 1
```

* -x: 使用简单身份验证。
* -D: 指定用于绑定到 LDAP 服务器的管理员 DN。
* -W: 提示输入管理员密码。
* -b: 指定搜索的起始点（Base DN）
* "(uid=huoyijie)": 指定 LDAP 搜索过滤器，这里是根据 uid 进行搜索

开启 LDAPS 加密

```bash
$ sudo apt install gnutls-bin ssl-cert
# 生成 CA key
$ sudo certtool --generate-privkey --bits 4096 --outfile /etc/ssl/private/mycakey.pem
```

编辑 /etc/ssl/ca.info 文件

```
cn = huoyijie.cn
ca
cert_signing_key
expiration_days = 3650
```

创建 CA 证书
```bash
# 创建自签名 CA 证书
$ sudo certtool --generate-self-signed \
--load-privkey /etc/ssl/private/mycakey.pem \
--template /etc/ssl/ca.info \
--outfile /usr/local/share/ca-certificates/mycacert.crt
# 更新受信任 CA 证书列表，增加刚刚创建的 mycacert.crt
$ sudo update-ca-certificates
Updating certificates in /etc/ssl/certs...
rehash: warning: skipping ca-certificates.crt,it does not contain exactly one certificate or CRL
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
```

为 LDAP server 生成 key 文件

```bash
$ sudo certtool --generate-privkey \
--bits 2048 \
--outfile /etc/ldap/ldap01_slapd_key.pem
```

编辑 /etc/ssl/ldap01.info 文件

```
organization = huoyijie
cn = LDAP01
ip_address = $LDAP_SERVER_IP
tls_www_server
encryption_key
signing_key
expiration_days = 3650
```

PS: 服务器没有域名，所以生成证书时，需配置 Subject Alt Name=IP地址，把 $LDAP_SERVER_IP 替换为服务器实际 ip 地址。如果有域名，只配置 cn = dnsname，不需要配置 ip_address = $LDAP_SERVER_IP

创建 LDAP server 证书

```bash
$ sudo certtool --generate-certificate \
--load-privkey /etc/ldap/ldap01_slapd_key.pem \
--load-ca-certificate /etc/ssl/certs/mycacert.pem \
--load-ca-privkey /etc/ssl/private/mycakey.pem \
--template /etc/ssl/ldap01.info \
--outfile /etc/ldap/ldap01_slapd_cert.pem
# 改变文件所属
sudo chown openldap:openldap /etc/ldap/ldap01_slapd_cert.pem
sudo chown openldap:openldap /etc/ldap/ldap01_slapd_key.pem
```

编辑文件 certinfo.ldif

```
dn: cn=config
add: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ssl/certs/mycacert.pem
-
add: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/ldap01_slapd_cert.pem
-
add: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/ldap01_slapd_key.pem
```

启用 LDAP TLS 配置
```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f certinfo.ldif
```

编辑文件 /etc/default/slapd
```
SLAPD_SERVICES="ldap://127.0.0.1:389/ ldaps:/// ldapi:///"
```

测试 LDAPS:
```bash
# 重启 slapd
$ sudo systemctl restart slapd
$ ldapwhoami -x -H ldaps://{LDAP_SERVER_IP}
anonymous
```

PS: LDAP_SERVER_IP 替换为 LDAP 实际地址

## 创建 Next.js 项目

```bash
$ npx create-next-app user-auth-with-openldap
Need to install the following packages:
create-next-app@14.0.4
Ok to proceed? (y) y
✔ Would you like to use TypeScript? … No / Yes
✔ Would you like to use ESLint? … No / Yes
✔ Would you like to use Tailwind CSS? … No / Yes
✔ Would you like to use `src/` directory? … No / Yes
✔ Would you like to use App Router? (recommended) … No / Yes
✔ Would you like to customize the default import alias (@/*)? … No / Yes
```

启动应用
```bash
$ npm run dev

> user-auth-with-openldap@0.1.0 dev
> next dev

   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000

 ✓ Ready in 766ms
```

点击 http://localhost:3000/ 打开浏览器

![运行应用](https://cdn.huoyijie.cn/uploads/2023/12/nextjs.png)

## 下一篇

这篇文开头给出了代码库地址、在线 Demo 体验地址，然后介绍了本项目即将用到的一些技术，并着重介绍了如何安装部署 OpenLDAP，如何开启 TLS 确保数据传输安全，最后创建了一个新的 Next.js 项目。下一篇文章会着重介绍如何在一个 Next.js 项目中同时实现前端页面和后端 API，如何免费部署到 Vercel 云，欢迎大家关注～