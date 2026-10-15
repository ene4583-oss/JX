# Jian Xu 简单版 · Node.js + HTML + MySQL

**不用 Java，不用 IntelliJ，不用 Maven。** 当前网站只使用 `backend/` 和 `frontend/`。
此仓库只包含当前 Node.js 版，不需要运行任何 Java 项目。

## Windows：如何开始

1. 安装 **Node.js LTS（22 或以上，推荐 24）**：https://nodejs.org/ 。如果已经安装，直接下一步。
2. 确认你的 **MySQL 正在运行**。原有 `jx_stamping_db` 可以直接使用；先做好备份。
3. 在 GitHub 点击 **Code → Download ZIP**，解压后找到并双击根目录 **`start-windows.bat`**（或 `启动网站.bat`，两者相同）。
4. 第一次会自动安装依赖并打开浏览器。在网页填写 **MySQL 用户名、密码、地址和数据库名**，点击保存。不需要编辑代码或 IntelliJ 运行配置。
5. 有原来的 `admins` 表时使用原账号登录；空库请展开「首次管理员账号」，设置至少8位管理员密码。
6. 登录后，管理员进入「Excel 导入」，选择 `2025.xlsx`，先检查再导入，然后在「员工账号」新增每位员工的个人账号。

以后使用：**启动 MySQL → 双击 `start-windows.bat` → 登录**。启动窗口要保持开启；关闭窗口会停止网站。
首次设置只做一次，资料写在本机 `backend/.env`，管理员密码只以 BCrypt 散列保存到 MySQL。`.env` 被 Git 忽略，不要上传或截图给别人。

如果浏览器没有自动打开，请复制启动窗口显示的完整网址。首次设置链接含临时验证信息，请只在本机打开，不要转发。没有设置验证信息的浏览器不能修改数据库连接。

## 从未设置过网站密码，或忘记管理员密码

在服务器本机双击根目录 **`set-admin-password.bat`**：

1. `Username [admin]:` 直接按 Enter 使用 admin，或填写需要恢复的账号。
2. `New password` 输入你自己的新密码（至少8位），再按 Enter。
3. `Confirm new password` 再输入一次。
4. 出现 `Administrator saved` 后，启动网站并使用这个账号和新密码登录。

**输入密码时不会显示字符或星号，这是正常的。** 这会创建/恢复指定管理员账号，不删除客户、产品或其他员工。该账号旧会话会要求重新登录。此工具只在服务器本机执行，不提供网页公开重设接口。

更新旧版本时保留原来的 `backend/.env`，不要删除或上传它。Mac/Linux 可在 backend 目录执行 `npm run admin:password`。

## 员工怎样使用

员工只需要浏览器，**不用安装 Node.js、MySQL 或开发工具**。管理员需先把网站部署到公网服务器，员工才能在外地通过 HTTPS 网址访问。

1. 登录自己的员工账号。
2. 搜索或扫描已有产品；新客户/新设备点「新增产品 / 客户」。可选已有客户，或手动输入姓名、地址、电话及产品资料。
3. 保存后生成永久产品 QR。以后在产品卡片点击 **QR / 重印**，可重新打印或下载同一个二维码。
4. 将产品加入待打印清单，选择**本次 DE 或 MCM**，预览后保存 PDF，再下载或打印。
5. 历史页可重新打印当时的 PDF。客户/产品后续修改不会改变旧 PDF。

手机可以独立录入和打印，无须办公室电脑；也可在电脑的「手机扫描 → 电脑即时接收」建立配对，手机登录后扫描配对码，再扫产品，电脑会自动接收。配对码5分钟内单次有效，会话12小时有效；所有业务和配对清单保存在 MySQL，服务器重启后仍可恢复。

## 资料与模板规则

- 同一客户下，按品牌 + 型号 + 序号防止重复；不同客户相同序号不会误合并。无序号产品也能得到独立 UUID。
- QR 只引用永久产品 ID，扫码登录后读取数据库最新资料。不要更换正式域名；换域名需保留旧域名跳转或重印标签。
- **每次打印都可选择 DE / MCM，同一产品不绑定某家公司。** CRA 注册号默认建议 MCM，其他 DE，本次打印选择优先。
- 两家公司均有9种模板：ATN、ATS、ATP、ATE、SLL、SLC、ATL、BTU、ATP (M)。模板已移除示例客户、日期、品牌、容量、注册号及预先勾选内容；保留原版式和固定维修商资料/印章。
- SIC 按确认规则映射 SLC，ATP_M 映射 ATP (M)；ATK、SIA、ATP-AUTO MACHINE 等保留原值，标记待确认。选好正确类型、补齐品牌后才能生成正式 PDF。
- Excel 使用原 `2025.xlsx` 的18个标题。重复上传相同文件不会重复导入；每行历史和原始文件保存到数据库。空白行跳过，缺客户名的行在结果中列为 incomplete_rows，可修正文件后重传。
- 原表没有的费用、单号和备注保存到业务记录，不塞进无关的表格位置。检验项目留空时不自动勾选。

## 文件位置

| 内容 | 位置 |
|---|---|
| 启动程序 | 根目录 `start-windows.bat` / `启动网站.bat` / `start.sh` |
| Node.js 后端 | `backend/server.js`、`backend/lib/` |
| 网页 | `frontend/index.html`、`app.js`、`app.css` |
| 首次设置网页 | `frontend/setup.html`、`setup.js` |
| MySQL 建表 SQL | `backend/sql/schema.sql` |
| 清理后的 PDF 和坐标 | `backend/assets/templates/` |
| 原始 PDF | `backend/templates/` |

启动自动建立 `app_` 开头的表，不删除或改写旧 `admins` / `import_records` 表。Java 版已有 `app_` 数据表、账号、客户、产品、QR 和 PDF 均可继续使用，不必重新导入。旧原型只有 `import_records` 时，请从原 Excel 导入到新版业务表。

## Mac / Linux / 命令行

安装 Node.js LTS 和 MySQL 后，在根目录执行：

```sh
./start.sh
```

或手动执行：

```sh
npm run install:app
npm start
```

不要直接双击 `frontend/index.html`：网页必须通过启动窗口提供的网址访问。默认本机端口3000，首次设置只允许在服务器本机操作。

## 让外勤员工从外面使用

本机测试不会自动变成公网网站。正式使用需要一台公网服务器、域名及 HTTPS。仓库提供 Docker Compose + MySQL 8.4 + Caddy 自动 HTTPS，安装在服务器一次，员工不用安装。

1. 把域名 DNS 指向服务器，开放80/443。不要公开 MySQL3306或应用3000。
2. 复制根目录 `.env.example` 为 `.env`，填写域名、独立强数据库密码、首次管理员密码，以及至少32位随机 SESSION_SECRET。
3. 在根目录执行：

```sh
docker compose up -d --build
```

随机字符串可用 `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` 生成。已有外部 MySQL 时可单独部署 Node：配置 `backend/.env.example` 所列变量，设置 NODE_ENV=production、COOKIE_SECURE=true、PUBLIC_BASE_URL=https://你的域名，并通过 HTTPS 代理转发至3000。远程 MySQL 可启用 DB_SSL=true 和受信任的 DB_SSL_CA，TLS 证书校验不会关闭。

- 正式部署不开放首次设置向导，必须先安全配置环境变量。TRUST_PROXY=1 只适用于应用仅能经一个可信反向代理访问的部署。
- Docker 的数据保留在 mysql_data 卷中；**不要执行 `docker compose down -v`**，否则会删除数据库。定期备份并验证恢复。
- 账号、会话、产品、配对和 PDF 都保存在 MySQL。SESSION_SECRET 要保持不变；换密钥会要求员工重新登录，但不影响产品资料。
- 只有管理员可导入 Excel 和管理账号。停用账号或重置密码会撤销旧登录。
- 网站需要网络连接，没有离线同步。公开网站和实体手机摄像头/打印机仍需在你的部署环境验证。

## 测试

```sh
npm test
```

默认测试 Excel 解析和18种 PDF。数据库测试需专用 `_test` 数据库，设置以下变量后再运行 `npm test`：

```text
RUN_MYSQL_TESTS=true
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3307
TEST_DB_NAME=jianxu_node_test
TEST_DB_USER=root
TEST_DB_PASSWORD=测试数据库密码
```

禁止使用生产库做测试。测试涵盖员工登录、CSRF/权限、手动新增及版本冲突、稳定QR、手机传送/去重、DE/MCM临时选择、PDF保存、持久化登录、账号撤销、导入去重与回滚、原账号迁移和网页首次设置。

## 此版本的验证结果

- Node.js 24 冻结依赖安装成功；7项自动化测试全部通过，没有跳过。数据库集成使用隔离的 MariaDB 11.4，通过 MySQL 驱动连接；另提供 MySQL 8.4 的 GitHub Actions 工作流。
- Chromium 桌面/手机尺寸实测通过：网页首次设置、登录、新增客户产品、QR重印入口、手机配对传送、PDF预览及保存、真实Excel导入。
- 2025.xlsx 在隔离测试库保留4,208行历史，建立3,657件产品，跳过17行空白；未知类型5行待确认。原始客户Excel没有复制到代码仓库，正式MySQL没有改动。
- 18种PDF均可生成，中文客户文字可正确提取，示例客户资料已清除；实体打印机和真实手机相机仍需在你的环境实测。
- 当前依赖安全审计为0项已知漏洞。正式服务器和域名尚未部署，代码上传GitHub不等于网站上线。

### 把 Excel 记录导入网站

1. 用管理员账号登录，点击「Excel 导入」。
2. 选择 `.xlsx` 文件，栏位沿用 `2025.xlsx`；第一行至少包含 `Name`、`Address`、`Type`、`Brand`、`S/No`。
3. 点击「检查文件」，查看有效记录、缺少客户名称及待确认类型。检查不会写入数据库。
4. 点击「确认导入」，完成后到「产品与扫码」搜索客户或产品，点击「历史」查看原有记录。

同一个文件重复上传不会重复写入。公司规则可选自动（CRA → MCM，其余 → DE），每次打印仍可自行选择 DE 或 MCM。只接受 `.xlsx`，旧 `.xls` 请先在 Excel 另存为 `.xlsx`。

### 打印、修改和导出记录

- 「待打印清单」可逐件填写 Stamping Fee 和安全贴纸序号。费用仅进入独立的 List Format，不印在 DE / MCM 检验表；清单按原上传文件的表头和栏位生成，自动分页并合计。
- 点击「修改本次资料」可修正本次表格的客户名称、地址、品牌、序号及相关栏位；这些修改保存到本次记录，不会改动产品库或 QR。
- 「产品与扫码」的「导出产品 Excel」可导出当前产品库（包括尚未打印的产品）。
- 「已保存表格」提供 DE / MCM PDF、List Format PDF 和「导出 Excel」。页首按钮导出全部已保存记录，每件产品、每次送检对应一行，使用 `2025.xlsx` 的18个标题及顺序；电话、序号和注册号保留为文字，费用为数值。
- Excel 的 `Total Price` 使用本次表格填写的总额，只写在该表格的第一行，避免重复累计；没有填写的资料保持空白。
- 员工可以修改、删除自己保存的表格，管理员可以处理全部表格。删除需要网页确认，会删除该份 PDF 和记录，保留客户、产品、QR 及原 Excel 导入历史。
- 管理员在「员工账号」上传公司 Logo（PNG / JPG，最多2MB），图片保存在 MySQL，登录页和工作台会显示同一张 Logo。

### 手机扫码和导入栏位修复

- 本地启动默认监听局域网，并在启动窗口及「手机扫描 → 电脑即时接收」显示同 Wi-Fi 手机地址。手机不能使用 `localhost` 或 `127.0.0.1` 访问电脑；旧标签需要重印，产品编号保持不变。Windows 防火墙需允许 Node.js 通过专用网络。
- 外勤连接其他 Wi-Fi 或手机网络时，必须使用已部署的公网 HTTPS 网站。管理员可在「网站设置」填写已部署的地址来更新 QR；保存地址不会自动部署服务器。生产部署以环境变量 `PUBLIC_BASE_URL` 为准。
- 「网站设置」提供 Logo 预览和保存；PNG / JPG 保存在 MySQL，在登录页和工作台显示。换电脑或重启服务不需要重新上传。
- Excel 导入接受大小写、空格差异及 `Phone number` 等标题别名。Area、Baru/Lama（B/Baru、L/Lama）、Model、Stamping Fee、Phone No. 均写入对应资料，并在产品卡片或编辑窗口显示。Stamping Fee 作为每次 List Format 的默认值，可按当次实际费用修改。
- 已在旧版导入的文件，重新上传原 `.xlsx` 并确认导入即可补齐字段；修复沿用原产品编号和历史记录，不重复新增无序号产品。已经人工编辑过的产品资料不会被历史导入覆盖；已有非空的客户地区和电话会保留。
- DE / MCM PDF 顶部用于识别的公司及类型标题不再输出；表格的正式表头、标志和正文保留。旧 PDF 请在「已保存表格」修改后重新保存以重新生成。
