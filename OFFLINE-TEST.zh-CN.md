# 外出离线版：第一次测试

主机与员工电脑都更新到 **2026.11.26.1**。各自使用自己的 `backend/.env` 和 MySQL 数据库；保留店里原有数据库。员工电脑仍需预先安装 Node.js、MySQL 和项目依赖，首次准备时先联网。

## 出发前，在店里主机

1. 用管理员账号进入 **Management → Offline field trips**。
2. 输入本次行程名称，例如 `Raub 26 Nov`。
3. 暂时不要勾选 `Include existing Complete Record PDFs`，客户和产品资料仍然会带过去。
4. 按 **Export departure package**，把下载的 `.jx.gz` 文件用 U 盘复制到员工电脑。不用解压。

## 在员工电脑

1. 启动这台电脑的 JX，浏览器打开 `http://localhost:3000`，登录本机的管理员账号。
2. 进入相同的 **Offline field trips** 栏目，选择出发资料包，按 **Preview import**。
3. 如有冲突，查看 Local（本机）和 Incoming（资料包）内容，逐项决定保留哪份。
4. 确认这确实是员工电脑，勾选 **This is the employee laptop**，按 **Import reviewed package**。这个确认不要在店里的主机上乱勾。
5. 如需带走原本的待打印清单，按 **Add imported products / queue to this browser**。
6. 关闭外部网络后，仍通过这台电脑的 `localhost:3000` 使用系统。试着新增一个明显标记为 TEST 的产品，保存、生成 PDF 并按 Complete。普通 Print 只生成 PDF，按 Complete 才加入 Complete Record。

客户及产品资料可直接从出发包导入新数据库，不必再手动恢复整个 SQL 备份。账号、密码不在资料包里，请预先准备员工电脑本身的登录账号。

## 回来后

1. 员工电脑进入该行程旁边的 **Export return package**，下载回传包。
2. 用 U 盘把回传包带回店里主机。
3. 主机选择该文件 → **Preview import** → 解决冲突 → **Import reviewed package**。
4. 检查 TEST 产品及其 Complete Record 是否出现。需要继续打印的清单可再按 **Add imported products / queue to this browser** 加入主机；主机原有清单会保留。

同一回传包重复导入不会重复新增；两边同时改过的记录会要求选择。员工删除的已完成 stamping 记录会移入主机 Trash，产品保留；客户和产品删除不会自动带回。每包最多 30MB（解压后的资料最多 128MB）；旧 Complete Record PDF 通常不用带出。每次新行程都先从主机导出新的出发包，并在回来后先完成回传。

不要把员工电脑的整个 SQL 数据库覆盖回店里主机。
