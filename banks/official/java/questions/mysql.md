# MySQL

<!-- id: java-mysql-001; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# MySQL 字段类型如何按范围、精度和索引成本选型？

### 字段类型先服务业务语义

字段类型不是越大越安全，而是要按取值范围、精度、排序和索引成本选择。能用 int 就不要随手 bigint；金额不要用 float/double；状态值可以用 tinyint 或短枚举字典，但要保证语义可读和可演进。

### 常见选择

| 场景 | 推荐思路 |
| --- | --- |
| 金额 | DECIMAL 或整数分，明确舍入规则 |
| 时间 | DATETIME/TIMESTAMP 按时区策略选择 |
| ID | BIGINT 常见，自增或分布式 ID 看写入模式 |
| 短状态 | TINYINT + 字典，或业务明确的 ENUM |
| 文本 | VARCHAR 控长度，长文本单独 TEXT |

### 索引成本

索引会存字段值。字段越长，索引页能放的记录越少，树高、IO 和缓存命中都会受影响。长 VARCHAR 建索引时要考虑前缀索引、唯一性和排序规则。

### 易错点

手机号、订单号这类不是用来做数学计算的值，不适合用数字类型；IP 地址可以用 VARBINARY 或数值化存储；时间字段要统一时区和精度。字段设计一旦上线，改类型成本很高，要提前考虑增长空间和兼容。

<!-- id: java-mysql-002; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# 表设计中主键、唯一键、外键和约束如何取舍？

### 主键

主键用于唯一标识一行，InnoDB 的主键还是聚簇索引，叶子节点保存整行数据。主键应该短、稳定、单调性较好，避免频繁更新和过长随机值。

### 唯一键

唯一键表达业务不变量，例如同一租户下用户名唯一、订单号唯一。它不只是查询优化，更是并发下防重复写的最后防线。幂等场景应优先考虑唯一约束。

### 外键

外键能保证引用完整性，但会增加写入检查、锁和迁移成本。互联网高并发系统常把外键约束放在应用层和离线校验里；金融、后台管理、强一致小规模系统可以更多使用数据库外键。

### 约束怎么取舍

核心不变量尽量放数据库层，例如非空、唯一、检查约束。弱约束和跨服务约束可以放业务层。不要只靠应用代码保证唯一性，因为并发下两个请求可能同时通过应用校验，最后只能靠唯一键挡住。

### 实践建议

约束命名要规范；上线唯一键前先清洗历史重复数据；外键如果影响发布和分库分表，要谨慎使用。

<!-- id: java-mysql-003; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# 三范式和反范式分别解决什么问题，什么时候应该冗余字段？

### 三范式解决什么

三范式强调字段原子、非主属性依赖主键、避免传递依赖。它的目标是减少数据冗余和更新异常。比如用户名称只存用户表，订单表只存 user_id，用户改名时不用更新所有订单。

### 反范式解决什么

反范式是有意冗余字段，换取查询性能、简化 SQL 或保留历史快照。例如订单表冗余下单时的商品名、价格、用户地址，即使商品后来改名，历史订单仍要保持当时状态。

### 什么时候冗余

- 高频查询需要少 join。
- 需要历史快照，不能引用最新值。
- 跨库跨服务 join 成本高。
- 报表或列表页需要聚合后的展示字段。

### 冗余的代价

冗余字段会带来一致性问题。要明确谁是主数据、什么时候同步、失败如何补偿、是否允许短暂不一致。可用消息、定时校验、触发器或应用双写，但都要有监控和修复手段。

面试里可以说：范式保证一致性和可维护，反范式服务读性能和业务快照；选择取决于读写比例和一致性要求。

<!-- id: java-mysql-004; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# NULL、默认值、空字符串和三值逻辑会带来哪些坑？

### NULL 和空值不是一回事

NULL 表示未知或不存在，空字符串表示已知但为空。默认值表示没有显式传值时使用的值。它们在查询、唯一约束、聚合和索引上表现不同。

### 三值逻辑

SQL 有 true、false、unknown 三值逻辑。任何值和 NULL 比较通常得到 unknown。

~~~sql
where deleted_at = null      -- 错
where deleted_at is null     -- 对
where deleted_at is not null
~~~

NOT IN 遇到 NULL 也容易出坑，因为结果可能变成 unknown，导致查不到预期数据。

### 约束和索引

MySQL 唯一索引允许多个 NULL，因为 NULL 不等于 NULL。如果业务上要求“空也唯一”，要用 NOT NULL 默认值或生成列等方式明确表达。

### 实践建议

能 NOT NULL 就尽量 NOT NULL，并给出合理默认值；真正表示未知、未设置、未完成时再用 NULL。统计时注意 count(*) 和 count(column) 不同，后者不统计 NULL。接口层也要区分字段缺失、null 和空字符串。

<!-- id: java-mysql-005; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# INNER、LEFT、RIGHT、SEMI JOIN 在结果集和执行上如何差异？

### INNER JOIN

INNER JOIN 只返回两边都匹配的行。它适合查“有对应关系”的数据，比如有订单的用户。优化器可以根据成本调整连接顺序。

### LEFT / RIGHT JOIN

LEFT JOIN 保留左表所有行，右表没有匹配时补 NULL。RIGHT JOIN 类似，只是保留右表。实际项目里更常用 LEFT JOIN，因为可读性更好，RIGHT JOIN 通常可以改写成 LEFT JOIN。

### SEMI JOIN

SEMI JOIN 表示只关心左表是否存在匹配行，不需要右表字段。SQL 里常见形式是 EXISTS 或 IN。MySQL 优化器可能把子查询改写成 semi join 策略。

~~~sql
select *
from user u
where exists (
  select 1 from orders o where o.user_id = u.id
);
~~~

### 常见坑

LEFT JOIN 后在 WHERE 中过滤右表字段，可能把外连接变成内连接。应该把右表过滤条件放到 ON 里，或明确接受这种语义。

连接性能取决于驱动表大小、索引、过滤条件和返回行数。不要只看 JOIN 类型名，要用 EXPLAIN 看实际执行计划。

<!-- id: java-mysql-006; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# GROUP BY、HAVING、窗口函数和聚合函数如何正确使用？

### GROUP BY 和聚合

GROUP BY 把多行按维度分组，聚合函数对每组计算结果，例如 count、sum、avg、max、min。SELECT 中非聚合字段通常应出现在 GROUP BY 中，避免语义不确定。

### WHERE 和 HAVING

WHERE 在分组前过滤原始行，HAVING 在分组后过滤聚合结果。

~~~sql
select user_id, count(*) cnt
from orders
where status = 'PAID'
group by user_id
having count(*) > 10;
~~~

能放 WHERE 的条件不要放 HAVING，因为越早过滤，参与分组的数据越少。

### 窗口函数

窗口函数不会把多行压成一行，而是在保留明细行的同时计算排名、累计值、分组统计等。例如 row_number、rank、sum() over。

### 使用边界

GROUP BY 适合得到每组一行结果；窗口函数适合“明细 + 组内计算”。大分组、排序和窗口函数都可能使用临时表和 filesort，要关注索引、数据量和内存临时表是否落盘。

<!-- id: java-mysql-007; difficulty: 1; tags: MySQL, MySQL基础; source: 精选 -->
# 分页查询为什么需要稳定排序，深分页如何优化？

### 为什么需要稳定排序

分页如果没有稳定 ORDER BY，同一条数据可能在不同页重复出现或漏掉。即使按 created_at 排序，如果 created_at 不唯一，也要加上唯一字段作为二级排序。

~~~sql
order by created_at desc, id desc
limit 20 offset 40;
~~~

### 深分页为什么慢

offset 很大时，MySQL 需要扫描并丢弃前面大量行，再返回后面的少量数据。即使有索引，也可能读取很多索引项和回表。

### 优化方式

游标分页更适合深翻页：

~~~sql
where (created_at, id) < (?, ?)
order by created_at desc, id desc
limit 20;
~~~

它利用上一次最后一条记录作为游标，避免跳过大量数据。

### 其他手段

如果必须支持跳到任意页，可以先用覆盖索引查 id，再回表查详情；或限制最大页数、使用搜索引擎、异步导出。分页设计要看产品需求，不要让用户随意跳到第 100000 页拖垮数据库。

<!-- id: java-mysql-008; difficulty: 2; tags: MySQL, MySQL基础, 索引; source: 精选 -->
# 慢查询中的 SELECT *、隐式转换、函数索引失效有哪些风险？

### SELECT * 的风险

SELECT * 会读取不需要的列，增加网络传输、内存和回表成本。表新增大字段后，旧查询也会被动变慢。覆盖索引也会因为查询了非索引列而失效。

### 隐式转换

字段类型和参数类型不一致时，MySQL 可能做隐式转换，导致索引无法按预期使用。

~~~sql
-- phone 是 varchar，却传数字
where phone = 13800138000
~~~

这可能让 MySQL 对列做转换，造成全表扫描。应用层参数类型要和字段类型一致。

### 函数导致索引失效

对索引列做函数、表达式计算，普通索引通常无法直接使用。

~~~sql
where date(created_at) = '2026-01-01'
~~~

更好的写法是范围查询：created_at >= '2026-01-01' and created_at < '2026-01-02'。

### 排查方式

看慢日志、EXPLAIN、扫描行数、rows examined 和实际耗时。优化前先确认结果语义不变，再决定改 SQL、改索引还是加生成列/函数索引。

<!-- id: java-mysql-009; difficulty: 2; tags: MySQL, MySQL基础; source: 精选 -->
# 字符集、排序规则和大小写敏感如何影响查询和唯一约束？

### 字符集和排序规则

字符集决定能存哪些字符，排序规则 collation 决定比较和排序方式。utf8mb4 才能完整支持 emoji 等 Unicode 字符，旧的 utf8 在 MySQL 中通常是 3 字节，不完整。

### 大小写和重音敏感

很多默认 collation 是大小写不敏感的，例如 a 和 A 可能被认为相等。唯一索引在这种 collation 下也会认为它们冲突。若业务要求大小写敏感，要选择 _bin 或区分大小写的 collation。

### 连接和比较

不同表、字段、连接字符集不一致，可能导致比较时报错、隐式转换或索引使用异常。跨库迁移时尤其容易遇到。

### 索引影响

utf8mb4 字符占用更多字节，长 varchar 建索引要考虑索引长度限制和前缀索引。排序规则不同也会影响 ORDER BY 结果和唯一约束语义。

### 实践建议

新系统统一 utf8mb4，并明确 collation。登录名、邮箱、邀请码这类字段要先定义大小写是否敏感，再建唯一索引。不要等线上出现“ABC 和 abc 算不算重复”再临时改。

<!-- id: java-mysql-010; difficulty: 2; tags: MySQL, MySQL基础; source: 精选 -->
# 如何设计审计字段、软删除、多租户和时间分区字段？

### 审计字段

常见审计字段包括 created_at、updated_at、created_by、updated_by、version。created_at 记录创建时间，updated_at 记录最后更新时间；如果需要追踪责任人，还要记录操作人。

### 软删除

软删除常用 deleted_at 或 is_deleted。它能保留历史和支持恢复，但所有查询都要带过滤条件，唯一索引也要考虑已删除数据是否占用唯一值。可用组合唯一索引或归档表解决。

### 多租户

多租户表通常带 tenant_id，并把 tenant_id 放进重要索引前缀，避免跨租户扫描。所有查询必须有租户条件，权限层也要防止漏传 tenant_id 造成越权。

### 时间分区字段

大表按时间归档或分区时，要有稳定的时间字段，例如 created_at。分区不是性能银弹，查询必须带分区条件才容易裁剪，否则仍可能扫很多分区。

### 设计建议

这些字段一开始就要定规范。后补审计、多租户、软删除往往需要全表回填、改索引、改所有查询，成本很高。

<!-- id: java-mysql-011; difficulty: 1; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# InnoDB 聚簇索引和二级索引的存储结构是什么？

### 聚簇索引

InnoDB 表数据按主键组织，聚簇索引的叶子节点存的是整行记录。所以按主键查询通常很快，因为找到叶子节点就拿到整行。

### 二级索引

二级索引的叶子节点存的是二级索引列和对应主键值，不存整行。用二级索引查到主键后，如果还需要其他列，就要再回到聚簇索引查整行，这叫回表。

~~~text
二级索引 idx_name: name -> primary key
聚簇索引 primary: primary key -> full row
~~~

### 主键长度的影响

因为每个二级索引叶子节点都保存主键值，主键越长，所有二级索引都会变大。UUID 字符串做主键会增加二级索引空间，也可能导致写入随机分布。

### 实践意义

如果查询只需要二级索引里的列和主键，可以形成覆盖索引，避免回表。设计索引时要考虑查询列、过滤列、排序列和主键大小，而不是只看 where 条件。

<!-- id: java-mysql-012; difficulty: 1; tags: MySQL, MySQL索引; source: 精选 -->
# 为什么 InnoDB 表必须重视主键选择，UUID 和自增主键各有什么影响？

### 为什么主键重要

InnoDB 的主键决定聚簇索引组织方式。没有显式主键时，InnoDB 会尝试选择非空唯一索引，否则生成隐藏 row id。隐藏主键不利于复制、排查和业务定位，所以表应显式定义主键。

### 自增主键

自增主键短、顺序递增，插入通常追加到 B+ 树右侧，页分裂少，二级索引也更小。缺点是分库分表或多节点写入时需要解决全局唯一和热点问题。

### UUID

UUID 全局唯一，适合分布式生成，但随机 UUID 写入会打散 B+ 树，增加页分裂、随机 IO 和索引膨胀。字符串 UUID 还很长，会放大所有二级索引。

### 折中方案

可以使用雪花 ID、时间有序 UUID、UUID_TO_BIN 交换时间位，或业务唯一键 + 内部自增主键。对外暴露的业务 ID 不一定要作为 InnoDB 主键。

### 回答重点

主键不只是“唯一标识”，它直接影响数据物理组织、插入性能、二级索引大小和范围扫描效率。

<!-- id: java-mysql-013; difficulty: 1; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# B+ 树索引为什么适合范围查询，和 Hash 索引有什么区别？

### B+ 树为什么适合范围查询

B+ 树所有数据都在叶子节点，叶子节点之间有有序链表。定位到范围起点后，可以沿叶子节点顺序向后扫描，非常适合 between、>、<、order by 这类范围场景。

### 磁盘友好

B+ 树一个节点可以存很多 key，树高通常很低。每次查询只需要少量页 IO，且页大小和磁盘/缓存机制匹配。

### Hash 索引

Hash 索引适合等值查询，通过 hash 定位。但它不保存顺序，不能高效范围查询，也不能用于 ORDER BY。Hash 冲突还要额外处理。

### 对比

| 索引 | 优点 | 不适合 |
| --- | --- | --- |
| B+ 树 | 等值、范围、排序、前缀 | 极端点查不一定比 hash 快 |
| Hash | 等值点查快 | 范围、排序、最左前缀 |

### 实践口径

InnoDB 常规索引是 B+ 树，因为业务查询不只有等值点查，还经常有范围、排序、分页和联合索引需求。

<!-- id: java-mysql-014; difficulty: 1; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 联合索引的最左前缀、范围截断和索引下推如何理解？

### 最左前缀

联合索引按定义顺序排序，例如 (tenant_id, status, created_at)。查询要从最左列开始连续使用，才能充分利用索引。

~~~sql
where tenant_id = ? and status = ?
order by created_at desc
~~~

这类查询很适合上述索引。

### 范围截断

一旦某列使用范围条件，后续列通常不能继续用于精确定位，只能用于过滤或排序的能力会受限。

~~~sql
where tenant_id = ? and created_at > ? and status = ?
~~~

如果索引是 (tenant_id, created_at, status)，status 在范围列后，定位能力会弱。

### 索引下推

ICP 允许存储引擎在扫描索引时先用索引里的条件过滤，减少回表次数。它不能改变索引排序规则，但能降低回表成本。

### 设计建议

联合索引顺序通常按等值条件、范围/排序、覆盖列考虑。不是选择性最高永远放最前，还要结合查询模式、排序和分页。

<!-- id: java-mysql-015; difficulty: 1; tags: MySQL, MySQL索引, 索引, 性能; source: 精选 -->
# 覆盖索引、回表、索引条件下推分别如何影响性能？

### 覆盖索引

查询需要的列都在同一个索引里，就叫覆盖索引。覆盖索引可以直接从二级索引返回结果，避免回表。

~~~sql
select user_id, status
from orders
where tenant_id = ? and status = ?;
~~~

如果索引包含 tenant_id、status、user_id，就可能覆盖。

### 回表

二级索引叶子节点只保存索引列和主键。如果查询还要其他列，就要拿主键回聚簇索引查整行。回表次数多时，随机 IO 和缓存压力会明显增加。

### 索引条件下推

ICP 会在存储引擎层用索引中已有列先过滤，再决定是否回表。它尤其适合联合索引中部分条件不能用于定位但能用于过滤的场景。

### 取舍

覆盖索引不是把所有列都塞进索引。索引越宽，写入越慢，占用空间越大。高频查询可以为覆盖设计索引，低频查询不一定值得。

<!-- id: java-mysql-016; difficulty: 2; tags: MySQL, MySQL索引; source: 精选 -->
# MySQL 优化器如何根据基数、成本和统计信息选择执行计划？

### 优化器看什么

MySQL 优化器会基于成本选择执行计划。成本来自统计信息、索引基数、扫描行数估算、是否需要排序/临时表、回表成本等。它不是简单“有索引就用索引”。

### 基数和选择性

基数表示不同值的数量。选择性高的索引更容易减少扫描行数，例如 user_id 通常比 gender 更适合索引过滤。但联合索引还要看查询模式和排序。

### 统计信息

统计信息不准会导致选错计划。数据分布倾斜、刚大量导入/删除、条件相关性强时，估算 rows 可能和真实行数差很多。可以用 ANALYZE TABLE 更新统计信息。

### 为什么会不走索引

如果优化器认为走索引要回表大量行，还不如全表扫描，就可能不用索引。小表、低选择性条件、范围很大、函数转换、隐式转换都可能导致这种结果。

### 排查方式

用 EXPLAIN 看估算，用 EXPLAIN ANALYZE 看实际执行。不要强行 force index 当长期方案，除非确认统计信息和优化器选择确实不适合且有回归监控。

<!-- id: java-mysql-017; difficulty: 2; tags: MySQL, MySQL索引; source: 精选 -->
# EXPLAIN 的 type、key、rows、filtered、Extra 如何解读？

### type

type 表示访问方式，常见从差到好有 ALL、index、range、ref、eq_ref、const。ALL 是全表扫描，range 是范围扫描，ref 表示用非唯一索引等值匹配，const 通常是主键/唯一键常量命中。

### key 和 rows

possible_keys 是可能用的索引，key 是实际选择的索引。rows 是优化器估算要扫描的行数，不是真实值。rows 很大时要警惕扫描成本。

### filtered

filtered 表示存储引擎返回的行经过条件过滤后剩多少比例。rows * filtered 可以粗略估算传给上层的行数。

### Extra

Extra 会提示 Using where、Using index、Using temporary、Using filesort 等信息。Using index 通常表示覆盖索引；Using filesort 不一定必然糟糕，但大数据量排序要关注。

### 注意

EXPLAIN 是估算计划，不等于实际耗时。MySQL 8 可用 EXPLAIN ANALYZE 对比真实执行行数和耗时。优化时要结合慢日志、数据量和业务频率。

<!-- id: java-mysql-018; difficulty: 2; tags: MySQL, MySQL索引; source: 精选 -->
# EXPLAIN Extra 中常见标记意味着什么？

### Using where

表示 server 层或存储引擎还要根据 where 条件过滤。它很常见，不一定坏。关键要看扫描了多少行。

### Using index

通常表示覆盖索引，查询列都能从索引中拿到，不需要回表。它一般是好信号，但也要看是否扫描了大量索引项。

### Using temporary

表示需要临时表，常见于 GROUP BY、DISTINCT、复杂排序。数据量大时临时表可能落盘，性能会明显下降。

### Using filesort

表示不能直接按索引顺序返回，需要额外排序。filesort 不一定是磁盘排序，但大结果集排序会很贵。

### Using index condition

表示使用了索引条件下推，存储引擎在索引层先过滤部分条件，减少回表。

### Using join buffer

可能说明被驱动表连接列没合适索引，需要 join buffer。要检查 join 条件和索引。

看 Extra 不能单独下结论，必须结合 type、key、rows、filtered 和实际耗时。

<!-- id: java-mysql-019; difficulty: 2; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# ORDER BY、GROUP BY 如何利用索引避免排序和临时表？

### ORDER BY 利用索引

如果索引顺序和 ORDER BY 一致，MySQL 可以按索引顺序返回，避免 filesort。例如索引 (tenant_id, status, created_at)，查询 tenant_id/status 等值过滤后按 created_at 排序就很合适。

### GROUP BY 利用索引

GROUP BY 如果能按索引有序扫描，相同分组连续出现，可以减少临时表和排序成本。联合索引顺序要和分组列匹配。

### 常见失效

- ORDER BY 列方向混乱，版本不支持或索引方向不匹配。
- WHERE 范围条件截断后续排序能力。
- 排序列来自不同表。
- ORDER BY 表达式或函数。
- 查询选择了太多列导致回表成本过高。

### 设计建议

高频列表页索引要同时考虑过滤和排序，常见形态是等值过滤列在前，排序列在后，再加主键保证稳定排序。分页时 order by created_at, id 比只按 created_at 更稳定。

<!-- id: java-mysql-020; difficulty: 2; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# LIKE、前缀索引、全文索引和倒排索引分别适合什么搜索场景？

### LIKE

LIKE 'abc%' 可以利用 B+ 树前缀范围；LIKE '%abc' 通常无法利用普通索引，因为前缀不确定。短文本前缀搜索可以用普通索引，包含搜索不适合。

### 前缀索引

长字符串可以建前缀索引，减少索引大小。

~~~sql
create index idx_email_prefix on user(email(20));
~~~

代价是选择性可能下降，无法完全覆盖完整字段，唯一性也要谨慎。

### 全文索引

MySQL FULLTEXT 适合自然语言分词搜索，能做相关性排序，但中文分词、复杂搜索体验和扩展性有限。

### 倒排索引

Elasticsearch、OpenSearch 这类搜索引擎使用倒排索引，适合分词、相关性、过滤聚合和复杂搜索。代价是数据同步、一致性和运维复杂度。

### 选择口径

前缀匹配用 B+ 树，长字段减少索引成本用前缀索引，站内全文搜索用搜索引擎，MySQL FULLTEXT 适合轻量场景。不要用 '%keyword%' 在大表上硬扫。

<!-- id: java-mysql-021; difficulty: 2; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 索引过多会带来哪些写入、空间和优化器成本问题？

### 写入成本

每个索引都要在 INSERT、UPDATE、DELETE 时维护。索引越多，写入要改的 B+ 树越多，页分裂、redo、buffer pool 压力都会增加。

### 空间成本

索引占磁盘，也占 buffer pool。二级索引还保存主键值，主键越长，二级索引越大。大量低价值索引会挤占真正热点数据的缓存。

### 优化器成本

索引太多会增加优化器选择计划的成本，也可能因为统计信息和索引相近导致计划不稳定。多个前缀相同的冗余索引也会增加维护负担。

### 常见冗余

有 (a,b,c) 后，单独 (a) 可能是冗余；但如果 (a) 更小且高频，也可能保留。判断不能只看前缀关系，还要看查询、排序、覆盖和写入成本。

### 处理建议

定期用 performance_schema、sys schema、慢日志和执行计划分析索引使用。下线前先评估风险，MySQL 8 可用 invisible index 做灰度验证。

<!-- id: java-mysql-022; difficulty: 2; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 索引失效的常见原因有哪些，如何系统排查？

### 常见原因

索引失效通常不是“索引坏了”，而是 SQL 写法或成本估算让它用不上。

- 对索引列使用函数或表达式。
- 隐式类型转换或字符集/排序规则转换。
- LIKE 以通配符开头。
- 联合索引不满足最左前缀。
- 范围条件后续列无法继续定位。
- OR 条件中部分列无索引。
- 低选择性条件扫描太多，优化器选择全表扫。

### 排查步骤

先看 EXPLAIN 的 key、type、rows、Extra，再看条件是否可改写。然后确认字段类型、参数类型、字符集、统计信息是否正确。必要时用 EXPLAIN ANALYZE 看真实行数。

### 改写例子

date(created_at) = '2026-01-01' 改成时间范围；phone varchar 就传字符串；多个 OR 可考虑 UNION ALL；JSON 字段可用生成列或函数索引。

### 注意

索引没被使用不一定是错。小表、返回大比例数据时，全表扫描可能更便宜。目标是总成本低，而不是强迫走索引。

<!-- id: java-mysql-023; difficulty: 3; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 函数索引、生成列和 JSON 索引适合解决什么问题？

### 函数索引

MySQL 8 支持表达式/函数索引，适合查询条件经常对字段做固定表达式处理的场景。例如 lower(email) 查询、日期截断查询。它能避免每次全表计算。

### 生成列

生成列把表达式结果作为虚拟列或存储列，再对生成列建索引。它适合把 JSON 字段里的某个 key、复杂计算结果提取出来索引。

~~~sql
alter table orders
add buyer_id bigint generated always as (json_extract(extra, '$.buyerId')) stored,
add index idx_buyer_id(buyer_id);
~~~

### JSON 索引

JSON 字段灵活，但直接查 JSON 路径成本高。高频过滤字段应提取成生成列或独立列，并建立索引。

### 取舍

函数索引和生成列会增加写入计算和维护成本，也会让表结构更复杂。适合高频、稳定表达式查询；不适合随意把所有 JSON key 都索引化。

### 实践建议

如果 JSON 字段已经承载核心查询条件，说明模型可能需要拆列。JSON 更适合扩展属性，不适合替代关系模型。

<!-- id: java-mysql-024; difficulty: 3; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 唯一索引如何参与并发控制和业务幂等？

### 唯一索引是并发防线

应用层先查再插，在并发下不安全。两个请求可能同时查到不存在，然后都插入。唯一索引能在数据库层保证只有一个成功。

~~~sql
insert into payment_request(request_id, status)
values (?, 'INIT');
~~~

request_id 建唯一索引后，重复请求会产生 duplicate key，应用可以查询原记录返回已有结果。

### 幂等设计

幂等键通常来自业务请求号、订单号、外部流水号。唯一索引负责防重复写，业务逻辑负责重复请求时返回一致结果。

### 并发控制

唯一索引插入会涉及锁和冲突检测。高并发写同一个唯一值时，只有一个事务成功，其他事务等待或失败。这个能力比应用锁更可靠。

### 注意点

唯一索引要匹配业务范围，例如 tenant_id + order_no，而不是全局 order_no。NULL 在唯一索引中可能允许多条，要根据业务设置 NOT NULL。

<!-- id: java-mysql-025; difficulty: 3; tags: MySQL, MySQL索引, 索引; source: 精选 -->
# 高频查询的索引评审应检查哪些维度？

### 先看查询形态

索引评审要从真实 SQL 出发：where 条件、join 条件、order by、group by、limit、select 列、返回行数、调用频率。没有 SQL 只谈索引，容易建错。

### 评审维度

| 维度 | 问题 |
| --- | --- |
| 过滤 | 等值、范围、选择性如何 |
| 排序 | 是否能避免 filesort |
| 覆盖 | 是否需要回表 |
| 稳定性 | 分页排序是否稳定 |
| 写成本 | 是否影响高频写入 |
| 冗余 | 是否被已有联合索引覆盖 |

### 验证方式

用 EXPLAIN/EXPLAIN ANALYZE 看计划和实际行数，用慢日志看真实耗时和扫描行数，用线上数据分布验证选择性。测试库小数据跑得快没有说服力。

### 变更策略

新增索引要考虑 online DDL 影响、磁盘空间、主从延迟和回滚。高风险索引可以先在低峰期加，观察写入延迟、buffer pool、复制延迟和慢查询变化。

<!-- id: java-mysql-026; difficulty: 3; tags: MySQL, MySQL索引, 索引, 安全; source: 精选 -->
# 下线无用索引前如何验证使用情况和回滚方案？

### 先确认真的无用

无用索引不能只凭“我没看到 SQL 用它”。要结合 performance_schema/table_io_waits_summary_by_index_usage、sys schema、慢日志、审计日志、业务代码搜索和执行计划。低频报表、月底任务、应急查询也可能依赖它。

### 看是否冗余

如果有 idx(a,b)，idx(a) 可能冗余，但也可能因为更小、更适合某些查询而有价值。要比较查询频率、覆盖列、排序和写入成本。

### 灰度方式

MySQL 8 可以把索引设为 invisible，让优化器不使用它，但索引仍维护。观察一段完整业务周期，如果没有慢查询和错误，再考虑删除。

~~~sql
alter table orders alter index idx_old invisible;
~~~

### 回滚方案

删除索引前要记录 DDL、索引定义和评估证据。大表重建索引可能耗时很长，回滚不是秒级操作。关键表要准备变更窗口、备份和容量评估。

### 注意

下线索引的收益主要是减少写入和空间成本，但风险是某些查询突然变慢。要用监控证明收益和风险都可控。

<!-- id: java-mysql-027; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# ACID 四个特性在 InnoDB 中分别由什么机制保障？

### ACID 不是四个独立开关

InnoDB 通过日志、锁和 MVCC 一起保证事务能力。

| 特性 | InnoDB 里的主要机制 |
| --- | --- |
| Atomicity 原子性 | undo log 记录回滚信息，事务失败时撤销已做修改 |
| Consistency 一致性 | 约束、外键、唯一索引、事务边界和业务规则共同保证 |
| Isolation 隔离性 | MVCC 提供一致性读，行锁/间隙锁/临键锁控制并发写 |
| Durability 持久性 | redo log、刷盘策略和两阶段提交保证提交后可恢复 |

原子性靠 undo，不是 redo；持久性靠 redo，不是 binlog。binlog 主要服务复制和恢复到某个时间点。

### 提交时发生了什么

事务修改数据页时，先产生 undo，再修改 buffer pool 中的数据页，同时写 redo log。提交时 redo 按策略落盘，并和 binlog 通过两阶段提交保持一致。崩溃后，已提交的事务用 redo 重放，未提交的事务用 undo 回滚。

### 面试里要说清楚

ACID 的“C”不完全由数据库自动兜底。数据库能保证约束不被破坏，但转账不能出现负余额、订单状态流转合法这类业务一致性，还需要应用把检查和写入放进正确的事务流程。

<!-- id: java-mysql-028; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# MySQL 四种隔离级别分别会出现哪些并发现象？

### 四种隔离级别

| 隔离级别 | 可能问题 | 常见理解 |
| --- | --- | --- |
| READ UNCOMMITTED | 脏读、不可重复读、幻读 | 能读到别人未提交的数据，线上很少用 |
| READ COMMITTED | 不可重复读、幻读 | 每条语句生成新的 Read View，Oracle/PostgreSQL 常见默认口径 |
| REPEATABLE READ | 标准里仍可能幻读，InnoDB 做了增强 | 一个事务内普通 SELECT 看到同一快照 |
| SERIALIZABLE | 并发最低 | 读也更容易加锁，适合极少数强隔离场景 |

脏读是读到未提交数据；不可重复读是同一行两次读取结果不同；幻读是同一条件两次读取出现新增或消失的行。

### InnoDB 的特殊点

InnoDB 默认 REPEATABLE READ。普通 SELECT 使用 MVCC，所以同一事务内多次读通常稳定；当前读，例如 UPDATE、DELETE、SELECT FOR UPDATE，会读最新已提交版本并加锁。范围当前读会用 next-key lock 降低幻读风险。

### 业务选择

大多数互联网业务用 RC 或 RR 都可以，关键是理解自己的读写语义。报表、列表页通常不需要强隔离；扣库存、抢券、转账这类流程要用唯一约束、条件更新、锁定读或乐观锁兜住并发写。

<!-- id: java-mysql-029; difficulty: 2; tags: MySQL, MySQL事务, MVCC; source: 精选 -->
# MVCC、Read View、undo log 如何实现一致性读？

### MVCC 解决什么

MVCC 让读请求尽量不阻塞写请求。普通 SELECT 不需要等待正在修改同一行的事务，而是根据 Read View 去判断哪个历史版本对当前事务可见。

每行记录会带有事务版本信息。旧版本不直接保存在表里，而是通过 undo log 串起来。当前版本不可见时，InnoDB 会沿着 undo 链找上一个版本，直到找到可见版本或确认不存在。

### Read View 怎么判断可见

Read View 记录了创建快照时仍活跃的事务范围。判断一行是否可见时，会看该行最后修改事务 id：

- 修改事务已经提交且早于快照，通常可见。
- 修改事务在快照创建时仍活跃，不可见。
- 修改事务晚于快照创建，不可见。
- 当前事务自己改的记录，对自己可见。

RC 和 RR 的关键差异在 Read View 创建时机。RC 每条语句创建新的 Read View，所以能读到其他事务后来提交的数据；RR 通常事务第一次一致性读创建 Read View，后续复用，所以同一事务内普通 SELECT 结果稳定。

### 代价

长事务会让旧版本迟迟不能清理，undo 增长，purge 变慢，还可能拖慢备份和主从复制。因此 MVCC 不是免费快照，事务要尽快提交。

<!-- id: java-mysql-030; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# 快照读和当前读有什么区别，哪些 SQL 会加锁？

### 快照读

快照读是普通一致性读，不加行锁，读取的是符合 Read View 的历史版本。

~~~sql
select * from orders where id = 1;
~~~

它适合列表、详情、统计这类不要求马上锁住数据的读取。RR 下同一事务内普通 SELECT 通常看到同一份快照。

### 当前读

当前读读取最新已提交版本，并且通常会加锁，因为它接下来可能要修改或阻止别人修改。

~~~sql
select * from orders where id = 1 for update;
select * from orders where id = 1 lock in share mode;
update orders set status = 'PAID' where id = 1;
delete from orders where id = 1;
insert into orders(id, status) values (1, 'NEW');
~~~

UPDATE、DELETE、SELECT FOR UPDATE 是典型当前读。它们会根据索引命中情况加记录锁、间隙锁或临键锁。

### 容易踩的点

同一个事务里，先普通 SELECT 看到库存 10，不代表后续 UPDATE 一定基于这个快照。UPDATE 是当前读，会和其他事务的最新提交结果交互。需要强一致流程时，不要“先查再凭感觉写”，要用锁定读或条件更新：

~~~sql
update sku set stock = stock - 1
where id = ? and stock > 0;
~~~

影响行数为 1 才表示扣减成功。

<!-- id: java-mysql-031; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# InnoDB 的记录锁、间隙锁和临键锁如何触发？

### 三种锁的含义

记录锁锁住索引上的一条记录。间隙锁锁住两个索引记录之间的范围，不锁具体行。临键锁是记录锁加前面的间隙，用来防止范围内插入新记录。

InnoDB 的行锁是加在索引上的。SQL 没有走索引，可能扫描并锁住大量记录，甚至表现得像锁表一样重。

### 什么时候触发

唯一索引等值命中一条记录时，通常只需要记录锁。

~~~sql
select * from user where id = 10 for update;
~~~

范围查询、非唯一索引查询、查询不存在的记录时，更容易出现间隙锁或临键锁。

~~~sql
select * from orders
where user_id = 7 and created_at >= '2026-01-01'
for update;
~~~

这个查询如果走 user_id、created_at 的范围索引，锁的不只是已有订单，还可能锁住范围内可插入的位置。

### 为什么要关心

间隙锁会阻塞插入，不只是阻塞更新。很多“线上插入突然卡住”的问题，根因是另一个事务做了范围锁定读但迟迟不提交。

降低风险的办法是让锁尽量精确：使用高选择性索引，缩小范围，避免长事务，把锁定读放在事务后半段，并按固定顺序访问资源。

<!-- id: java-mysql-032; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# InnoDB 如何避免幻读，为什么 RR 下仍要理解 next-key lock？

### 幻读是什么

幻读关注的是“同一个范围条件下，第二次读多出了第一次没有的行”。例如事务 A 查询某用户待支付订单为空，事务 B 插入一条待支付订单并提交，事务 A 再查发现多了一条。

### InnoDB RR 怎么处理

普通 SELECT 在 RR 下使用同一个 Read View，第二次读仍看原快照，所以不会看到新插入的行。

当前读不同。SELECT FOR UPDATE、UPDATE、DELETE 要读最新版本并加锁。为了防止别人在范围里插入新行，InnoDB 会对索引范围加 next-key lock，也就是记录锁加间隙锁。

~~~sql
select * from coupon
where user_id = ? and status = 'UNUSED'
for update;
~~~

如果这个查询走合适的联合索引，它会锁住相关范围，避免并发插入破坏判断。

### 仍然要理解 next-key lock 的原因

RR 不是“所有场景都不用管幻读”。锁是否精确取决于索引，范围越大，并发影响越大；没有合适索引时，锁范围可能扩大。业务上真正要防重复，通常还要配唯一约束，例如 user_id + activity_id 唯一，不能只依赖一次范围查询。

<!-- id: java-mysql-033; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# 死锁如何产生，如何通过日志定位和降低死锁概率？

### 死锁怎么出现

死锁不是锁等待太久，而是两个或多个事务形成循环等待。典型例子是事务 A 先锁订单 1 再锁订单 2，事务 B 先锁订单 2 再锁订单 1。两边都等对方释放，数据库只能回滚其中一个事务。

范围锁、二级索引更新、外键检查、唯一索引冲突也可能制造死锁。很多死锁不是 SQL 看起来直接锁同一行，而是执行计划走了不同索引或锁顺序不同。

### 怎么定位

先看 InnoDB 最近一次死锁信息：

~~~sql
show engine innodb status;
~~~

重点看两个事务各自执行的 SQL、持有什么锁、等待什么锁、锁在哪个索引上。线上还应结合 error log、performance_schema.data_locks、data_lock_waits、慢日志和应用 trace，把死锁还原到业务流程。

### 怎么降低概率

- 所有事务按固定顺序访问资源，例如按 id 升序更新。
- 让查询走稳定且精确的索引，减少扫描和锁范围。
- 缩短事务，把外部 RPC、复杂计算移到事务外。
- 拆小批量更新，避免一次锁住大量行。
- 对 duplicate key、deadlock、lock wait timeout 做有限重试。

死锁在高并发系统里不能完全消灭，关键是让它少发生、可观测、可重试。

<!-- id: java-mysql-034; difficulty: 2; tags: MySQL, MySQL事务; source: 精选 -->
# 锁定读、NOWAIT 和 SKIP LOCKED 如何使用？

### 锁定读的用途

锁定读用于“读完马上要根据结果做决策”的场景。SELECT FOR UPDATE 加排他锁，别人不能再修改这些行；FOR SHARE 或 LOCK IN SHARE MODE 加共享锁，适合只防止别人修改。

~~~sql
select * from job where id = ? for update;
~~~

它必须放在事务里才有意义，事务提交或回滚后锁释放。

### NOWAIT

NOWAIT 表示拿不到锁就立刻报错，不排队等待。它适合用户请求、后台任务抢占这类不希望线程卡死的场景。

~~~sql
select * from seat where id = ? for update nowait;
~~~

应用收到错误后可以提示稍后重试，或换一个资源。

### SKIP LOCKED

SKIP LOCKED 会跳过已经被锁住的行，适合多个 worker 并发领取任务。

~~~sql
select id from task
where status = 'READY'
order by id
limit 10
for update skip locked;
~~~

拿到后立刻更新状态并提交。它提高吞吐，但不保证严格公平，某些任务可能因为长期被锁而延迟处理。

### 使用边界

锁定读不是通用加速器。它会降低并发，必须配合明确索引和短事务。能用唯一约束、条件更新解决的问题，不一定要先 SELECT FOR UPDATE。

<!-- id: java-mysql-035; difficulty: 3; tags: MySQL, MySQL事务; source: 精选 -->
# 自增锁 innodb_autoinc_lock_mode 如何影响并发插入？

### 自增锁保护什么

AUTO_INCREMENT 要保证同一张表生成的自增值不冲突。InnoDB 会在插入时使用自增锁或轻量互斥来分配 id。不同模式影响并发插入能力和 binlog 复制安全性。

### innodb_autoinc_lock_mode

| 模式 | 行为 | 影响 |
| --- | --- | --- |
| 0 traditional | 所有插入语句持有表级自增锁到语句结束 | 最保守，并发差 |
| 1 consecutive | 简单 INSERT 用轻量锁，批量/不确定行数插入用表级锁 | 兼顾连续性和并发 |
| 2 interleaved | 多个插入可交错分配自增值 | 并发最好，但自增值不保证语句内连续 |

MySQL 8 常见默认是 2。它适合 row-based binlog，因为复制不依赖语句重新生成同样的自增序列。

### 业务影响

自增 id 只应作为唯一标识，不应承诺连续。事务回滚、插入失败、批量插入都可能造成空洞。如果业务需要订单号连续，要单独设计号段或流水服务，不能依赖 AUTO_INCREMENT。

### 性能判断

高并发插入热点表时，自增主键通常仍比随机 UUID 更友好，因为写入集中在 B+ 树右侧，页分裂少。但极端写入量下，右侧热点页也可能成为瓶颈，需要分库分表或调整主键设计。

<!-- id: java-mysql-036; difficulty: 3; tags: MySQL, MySQL事务, 事务; source: 精选 -->
# 长事务会带来哪些 undo、锁等待、主从延迟和 purge 问题？

### 长事务的直接问题

长事务持有的 Read View 会阻止旧版本清理，undo log 越积越多，purge 跟不上时磁盘和查询成本都会上升。它还可能长时间持有行锁，导致其他事务锁等待。

### 对系统的连锁影响

长事务不只是影响本连接。

- 锁等待堆积，业务线程被占满。
- undo 版本链变长，普通查询也可能变慢。
- DDL 等待元数据锁，表结构变更卡住。
- 主从复制可能因为大事务或锁等待产生延迟。
- 备份和一致性快照持续时间变长。

### 常见来源

后台脚本边查边处理但不提交，应用开启事务后调用外部接口，分页扫描放在一个大事务里，手工运维连接 begin 后忘记 commit，都是高风险来源。

### 处理方式

事务里只放必须原子完成的读写。大批量任务按主键分段，每批提交；外部 RPC、文件处理、复杂计算放在事务外；监控事务年龄、undo 长度、锁等待和连接状态。发现长事务时先确认业务影响，再决定 kill 连接还是等待结束。

<!-- id: java-mysql-037; difficulty: 3; tags: MySQL, MySQL事务, 事务; source: 精选 -->
# 事务中的 autocommit、显式事务和只读事务有什么区别？

### autocommit

autocommit=1 时，每条独立 SQL 默认都是一个事务。单条 UPDATE 执行成功就提交，失败就回滚。这是大多数业务连接的默认模式。

~~~sql
update account set balance = balance - 100 where id = 1;
~~~

这条语句本身有事务边界，但无法和下一条语句组成原子操作。

### 显式事务

显式事务用 BEGIN/COMMIT/ROLLBACK 包住多条语句，适合转账、创建订单并写明细、扣库存并写流水这类必须一起成功或一起失败的流程。

~~~sql
begin;
update account set balance = balance - 100 where id = 1 and balance >= 100;
update account set balance = balance + 100 where id = 2;
commit;
~~~

显式事务要尽量短，异常路径必须 rollback，连接池归还连接前要清理事务状态。

### 只读事务

START TRANSACTION READ ONLY 告诉数据库这个事务不会写数据。它适合一致性报表、导出、复杂查询，能减少部分开销，也能防止误写。

~~~sql
start transaction read only;
select ...;
commit;
~~~

只读事务仍然可能很长，仍会持有 Read View，所以不能把大查询长期挂着不提交。

### 关键区别

autocommit 管单条语句，显式事务管业务原子性，只读事务管读取意图。不要为了“保险”把所有请求都包显式事务，事务越大，并发副作用越明显。

<!-- id: java-mysql-038; difficulty: 3; tags: MySQL, MySQL事务, 事务; source: 精选 -->
# 分布式事务、XA、TCC、Saga 和本地消息表如何取舍？

### 为什么需要分布式事务

当一个业务动作跨多个数据库、消息队列或外部服务时，本地事务只能保证单个资源内一致。比如订单库创建订单、库存库扣库存、消息队列发通知，任何一步失败都可能留下中间状态。

### 常见方案取舍

| 方案 | 适合场景 | 代价 |
| --- | --- | --- |
| XA | 少量资源、强一致要求高 | 阻塞重、性能差、故障恢复复杂 |
| TCC | 资金、库存预占等可冻结资源 | 业务要实现 Try/Confirm/Cancel |
| Saga | 长流程、多步骤业务 | 只能最终一致，需要补偿逻辑 |
| 本地消息表 | 业务写库后可靠发消息 | 有延迟，需要投递和消费幂等 |

### 本地消息表怎么用

在同一个本地事务里写业务数据和消息表。事务提交后，异步任务扫描未发送消息投递到 MQ，成功后标记已发送。消费者根据消息 id 或业务键做幂等。

~~~sql
begin;
insert into orders(...);
insert into outbox(message_id, topic, payload, status) values (...);
commit;
~~~

### 选择建议

能用单库事务解决就不要上分布式事务。必须跨系统时，先问业务能否接受最终一致；能接受时优先本地消息表、Saga 和幂等补偿。只有确实需要强一致且资源管理器支持时，再考虑 XA。

<!-- id: java-mysql-039; difficulty: 3; tags: MySQL, MySQL事务; source: 精选 -->
# 幂等、唯一约束和乐观锁如何配合处理并发写？

### 三者各自负责什么

幂等解决重复请求不重复产生副作用；唯一约束在数据库层防止重复插入；乐观锁防止并发更新覆盖彼此。

### 幂等和唯一约束

创建类请求要有幂等键，例如 request_id、order_no、payment_no，并在数据库里建立唯一索引。

~~~sql
insert into payment(payment_no, amount, status)
values (?, ?, 'INIT');
~~~

如果重复插入触发 duplicate key，应用查询已有记录并返回同一业务结果。不要只靠 Redis 标记或应用内存判断，因为宕机和并发都会绕过它。

### 乐观锁

更新类请求可以用 version 或状态条件控制。

~~~sql
update orders
set status = 'PAID', version = version + 1
where id = ? and status = 'WAIT_PAY' and version = ?;
~~~

影响行数为 1 表示成功，为 0 表示状态已变化或版本冲突。

### 组合方式

支付回调通常用支付流水号唯一约束保证只落一笔流水，再用订单状态条件更新保证 WAIT_PAY 只能变 PAID 一次。唯一约束挡重复写，乐观锁挡并发覆盖，幂等逻辑负责给重复调用返回稳定结果。

<!-- id: java-mysql-040; difficulty: 3; tags: MySQL, MySQL事务; source: 精选 -->
# 在线业务如何设计扣库存、转账等强一致写流程？

### 强一致写的核心原则

扣库存、转账这类流程不能先查后写再相信应用判断，必须把条件检查和写入放到同一个事务或同一条条件更新里，并依赖数据库约束兜底。

### 扣库存

最常见写法是条件更新：

~~~sql
update sku
set stock = stock - 1
where id = ? and stock > 0;
~~~

影响行数为 1 表示扣减成功，为 0 表示库存不足。然后在同一事务里写订单或库存流水。需要防重复下单时，再加 user_id + activity_id 等唯一约束。

### 转账

转账要先扣出账方，再加入账方，并写流水。扣款语句必须带余额条件。

~~~sql
update account
set balance = balance - 100
where id = ? and balance >= 100;
~~~

扣款成功后再给对方加钱，任一步失败都回滚。账户行建议按固定顺序加锁，降低死锁概率。

### 工程细节

金额用整数分或 decimal，不用浮点。每次写入都要有业务流水号并唯一。失败重试要幂等，不能重新生成不同流水。事务里不要调用支付渠道、物流接口等外部服务，外部动作通过消息和状态机推进。

<!-- id: java-mysql-041; difficulty: 3; tags: MySQL, MySQL事务, 事务; source: 精选 -->
# 如何监控锁等待、事务年龄和死锁？

### 锁等待看什么

锁等待要能回答三件事：谁在等，等谁，等在哪个索引或记录上。MySQL 8 可以看 performance_schema.data_locks 和 data_lock_waits；老版本常看 information_schema.innodb_trx、innodb_locks、innodb_lock_waits。

~~~sql
select * from performance_schema.data_lock_waits;
~~~

再结合 processlist、当前 SQL、事务开始时间和应用 trace，才能定位到具体接口。

### 事务年龄

事务年龄就是事务从开始到现在持续多久。要重点监控长时间 Sleep 但事务未提交的连接、活跃大事务、undo 积压和 History list length。长事务往往比单次慢查询更危险，因为它会拖住清理和 DDL。

### 死锁

死锁信息可以从 error log 或 show engine innodb status 获取。要记录死锁发生时间、参与 SQL、索引、锁模式、回滚事务，以及是否集中在某个业务路径。

### 告警建议

生产上至少设置锁等待超时、长事务阈值、死锁次数、MDL 等待、History list length、复制延迟等指标。发现问题时优先止血：确认是否有可 kill 的异常事务，再做 SQL 和事务设计优化。

<!-- id: java-mysql-042; difficulty: 3; tags: MySQL, MySQL事务; source: 精选 -->
# RC 与 RR 在真实业务中如何选择？

### RC 的特点

READ COMMITTED 每条语句都读最新已提交数据。它减少间隙锁使用，锁冲突通常比 RR 少，更适合高并发 OLTP 场景。代价是同一事务里两次普通 SELECT 可能看到不同结果，需要业务能接受这种变化。

### RR 的特点

REPEATABLE READ 在事务内提供更稳定的一致性读，适合希望一个事务里多次读取保持同一快照的场景。InnoDB 还会配合 next-key lock 处理范围当前读。但 RR 可能带来更多间隙锁，范围更新和锁定读的并发影响更大。

### 怎么选

如果业务大量短事务、读写高并发、明确用唯一约束和条件更新保证正确性，RC 通常更轻。很多订单、支付、库存系统可以使用 RC，但必须把并发正确性建立在约束和写语句上。

如果业务依赖事务内多次普通 SELECT 的一致视图，或者历史包袱默认 RR，继续用 RR 也合理。关键是理解当前读和快照读差异，不要误以为 RR 可以替代业务约束。

### 落地口径

隔离级别不是越高越好。先列出核心并发场景，用压测和故障演练验证锁等待、死锁和一致性，再统一项目规范。混用不同隔离级别时要非常谨慎。

<!-- id: java-mysql-043; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# redo log、undo log、binlog 分别在何时写入、解决什么问题？

### 三种日志各管一件事

redo log 是 InnoDB 的物理重做日志，保证已提交修改在崩溃后能恢复。undo log 记录旧版本，支持回滚和 MVCC。binlog 是 Server 层逻辑日志，服务复制、审计和按时间点恢复。

| 日志 | 主要作用 | 典型使用者 |
| --- | --- | --- |
| redo log | 崩溃恢复、持久性 | InnoDB |
| undo log | 回滚、一致性读 | InnoDB |
| binlog | 主从复制、PITR | MySQL Server、备份系统 |

### 写入时机

事务修改行前会产生 undo，修改数据页后产生 redo。提交时，redo 和 binlog 通过两阶段提交协调：redo prepare，写 binlog，再 redo commit。这样崩溃恢复时能判断事务到底应不应该提交。

### 常见误区

binlog 不是崩溃恢复的主力，redo 才是；redo 不是复制日志，binlog 才是；undo 不是备份日志，它主要用于回滚和提供旧版本。三者职责不同，但一次事务会同时牵涉它们。

<!-- id: java-mysql-044; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 两阶段提交如何保证 redo log 和 binlog 的一致性？

### 问题背景

InnoDB 的 redo log 和 Server 层的 binlog 分属两套系统。如果只写 redo 没写 binlog，主库恢复后有这笔数据，从库却永远复制不到；如果只写 binlog 没写 redo，恢复后主库没有这笔数据，从库可能有，都会造成不一致。

### 两阶段提交流程

提交时大致分三步：

1. InnoDB 写 redo log，并标记为 prepare。
2. Server 写 binlog，并按 sync_binlog 策略刷盘。
3. InnoDB 把 redo log 标记为 commit。

崩溃恢复时，如果看到 redo 是 prepare，就去检查对应 binlog 是否完整。binlog 完整则提交事务，不完整则回滚。

### 为什么有效

binlog 变成了判断 prepare 事务是否最终提交的依据。这样 redo 和 binlog 不再各自决定结果，而是通过 prepare/commit 状态和 binlog 完整性形成一致结论。

### 配置影响

innodb_flush_log_at_trx_commit 和 sync_binlog 决定提交时刷盘强度。双 1 最安全，但性能成本更高；降低刷盘频率能提高吞吐，但宕机时可能丢最近事务或复制日志。

<!-- id: java-mysql-045; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# MySQL 崩溃恢复流程如何利用 redo log 和 undo log？

### 崩溃恢复目标

MySQL 崩溃后，内存里的脏页可能还没刷到磁盘，磁盘页可能落后于已提交事务。恢复要做到：已提交的改动补回来，未提交的改动撤回去。

### redo 重放

InnoDB 启动时先扫描 redo log。对于已经提交、但数据页还没落盘的修改，按 redo 重放到数据页。这个过程让数据库不必每次提交都把所有数据页刷盘，只要 redo 可靠即可。

### undo 回滚

崩溃时还有未提交事务，它们可能已经改过数据页。恢复阶段会根据 undo log 回滚这些事务，保证不会留下半个事务。

### 和 binlog 的关系

遇到 redo prepare 状态的事务时，还要看 binlog 是否完整。binlog 完整说明事务应提交，binlog 不完整说明应回滚。这就是两阶段提交在恢复时发挥作用的地方。

### 工程关注

恢复时间取决于 redo 量、脏页情况、大事务和硬件 IO。大量长事务、大批量写入、异常关机会拉长恢复。生产要通过备份演练和故障拉起测试确认 RTO，而不是只相信配置。

<!-- id: java-mysql-046; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# binlog row、statement、mixed 格式有什么区别？

### statement

statement 记录原始 SQL。优点是日志小、可读性强；缺点是某些非确定性语句复制不安全，例如 now()、uuid()、limit 无稳定排序、触发器或函数行为差异等。

### row

row 记录每行变更前后的数据，复制最准确，也是现代生产更常用的格式。缺点是批量更新会产生大量日志，binlog 体积和网络传输压力更大。配合 binlog_row_image 可控制记录列的完整程度。

### mixed

mixed 默认用 statement，遇到可能不安全的语句切换到 row。它试图折中，但排查时不如统一 row 简单。

### 怎么选

主从复制、数据订阅、审计、CDC 场景通常选 row，因为下游需要确定的行级变化。statement 适合对日志体积极敏感且 SQL 可控的老场景。现在多数业务优先 row，再通过归档、压缩、保留周期和拆分大事务控制成本。

### 一个实际点

row 格式下，大事务会生成很大的 binlog event，可能造成复制延迟和恢复压力。不要把百万行更新放进一个事务里，应该分批提交。

<!-- id: java-mysql-047; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 主从复制的 dump、relay log、SQL thread 流程是怎样的？

### 复制链路

主从复制的核心是：主库写 binlog，从库拉取 binlog 存成 relay log，再由从库 SQL 线程重放。

1. 主库事务提交后写入 binlog。
2. 从库 I/O 线程连接主库，请求指定位置或 GTID 后的日志。
3. 主库 dump thread 把 binlog event 发给从库。
4. 从库 I/O 线程写入 relay log。
5. 从库 SQL thread 或 worker 读取 relay log 并执行。

### 延迟在哪里产生

主库写入太快、网络慢、从库 IO 慢、SQL 线程重放慢、从库有锁等待、大事务过大，都可能产生复制延迟。延迟不是一个原因，而是链路上任何一段积压。

### 并行复制

MySQL 支持从库并行回放，但并行度受事务依赖关系限制。同一个库、同一组冲突行上的事务很难完全并行。大事务也会拖住后续事务。

### 可靠性关注

复制不是备份。误删数据会被复制到从库。主从能提高读扩展和故障切换能力，但仍需要独立备份、binlog 保留和恢复演练。

<!-- id: java-mysql-048; difficulty: 2; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 半同步复制、GTID 和复制延迟如何影响高可用？

### 半同步复制

异步复制下，主库提交成功后不等从库确认，主库宕机时可能丢失尚未传到从库的事务。半同步要求至少一个从库收到 binlog 并确认后，主库才向客户端返回成功。

半同步降低丢数据风险，但不是绝对不丢。它确认的是从库收到日志，不一定已经重放完成；网络抖动时还会影响主库提交延迟，并可能退化为异步。

### GTID

GTID 给每个事务一个全局唯一编号，让复制位点不再只是 file + position。它简化主从切换、故障恢复和跳过已执行事务，减少人工找 binlog 位点的错误。

### 复制延迟

复制延迟会影响读写分离。用户刚写完主库，马上读从库可能读到旧数据。延迟还会影响故障切换：如果从库落后太多，提升它为主库可能丢事务。

### 高可用取舍

半同步提高 RPO，GTID 降低切换复杂度，延迟监控决定能不能安全读从和切主。三者要一起看，不能只打开半同步就认为高可用完成了。

<!-- id: java-mysql-049; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 主从切换、读写分离和延迟读如何避免读到旧数据？

### 读到旧数据的根因

读写分离中，写请求落主库，读请求走从库。从库通过复制异步或半同步追主库，只要存在延迟，用户写完马上读从库就可能看不到刚写的数据。

### 常用规避方式

- 写后读主：用户完成写操作后，一段时间内或当前会话内读主库。
- 按延迟路由：从库延迟超过阈值时摘除或降权。
- 关键读强制主库：订单支付结果、余额、权限变更等读主。
- 使用 GTID/位点等待：读前等待从库追到某个事务位点。
- 前端或服务端读自己的写：把刚写结果短期缓存到会话上下文。

### 主从切换风险

切主前要确认候选从库的 GTID 集合和延迟，避免提升一个落后的从库。切换后旧主恢复时不能直接加入，必须确认数据方向，防止双主写入或数据回滚。

### 设计口径

不是所有读都需要强一致。商品详情、列表、统计可以容忍短暂旧数据；支付状态、库存结果、账户余额通常不能。读写分离规则应该按业务一致性分级，而不是简单按 SELECT 全部分流到从库。

<!-- id: java-mysql-050; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# MHA、Orchestrator、MGR/InnoDB Cluster 各自解决什么问题？

### MHA

MHA 是传统 MySQL 主从架构下的故障切换工具。它负责探测主库故障、选择最合适从库提升为新主、尽量补齐 binlog、让其他从库改指向新主。优点是成熟，缺点是组件老、自动化和云原生能力有限。

### Orchestrator

Orchestrator 更偏复制拓扑管理。它能发现主从关系、分析复制健康度、做拓扑调整和故障恢复，也提供可视化和 API。大规模主从实例管理时，它比手工脚本更可控。

### MGR / InnoDB Cluster

MGR 是 MySQL Group Replication，InnoDB Cluster 在其上提供一套高可用方案。它使用组复制和共识机制做成员管理，支持单主或多主模式，更接近内建高可用。

### 怎么选

已有传统主从架构、主要想自动切主，可以考虑 Orchestrator 或 MHA。新系统希望使用 MySQL 官方内建高可用能力，可以评估 InnoDB Cluster。无论哪种方案，都要演练网络分区、脑裂防护、延迟切主、旧主回收和应用侧连接切换。

### 关键提醒

高可用工具解决的是故障检测和拓扑切换，不替你解决备份、误删恢复、慢 SQL、容量和应用重试。

<!-- id: java-mysql-051; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 备份恢复中 mysqldump、xtrabackup、binlog 增量如何取舍？

### mysqldump

mysqldump 是逻辑备份，导出 SQL 或表数据。优点是简单、可跨版本、可按库表恢复；缺点是大库慢、恢复慢、对实例压力较明显。适合小库、配置表、低频导出。

### xtrabackup

xtrabackup 是物理热备，直接备份 InnoDB 数据文件并处理 redo。优点是大库速度快、恢复快、对线上影响相对可控；缺点是依赖版本和存储格式，备份文件可读性差。适合生产大库全量备份。

### binlog 增量

binlog 增量记录备份之后的变更，用来做按时间点恢复。没有 binlog，只能恢复到全量备份时刻；有 binlog，才能恢复到误操作前一秒。

### 常见组合

生产常用 xtrabackup 做定期全量或增量物理备份，保留 binlog 做 PITR；少量核心表可额外 mysqldump 方便单表恢复。

### 真正要验证的是恢复

备份成功不等于能恢复。必须定期在隔离环境恢复，校验数据量、checksum、业务抽样、恢复耗时和 binlog 可用性。没有恢复演练的备份方案是不完整的。

<!-- id: java-mysql-052; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 如何做按时间点恢复和演练验证？

### PITR 的基本思路

按时间点恢复通常是先恢复最近一次全量备份，再按顺序回放 binlog 到目标时间或目标 GTID。目标通常是“误删发生前一刻”，而不是最新时间。

### 操作步骤

1. 找到误操作时间、库表范围和影响 SQL。
2. 在隔离实例恢复最近的全量备份。
3. 从备份点之后的 binlog 开始回放。
4. 回放到误操作前，或跳过误操作 event 后继续回放。
5. 校验数据，再决定是整库替换、单表导回，还是补偿修复。

### 注意事项

恢复不要直接在原库上试。先保留现场，防止覆盖证据。binlog row 格式下可以更准确定位行变更，但分析成本也更高。跨库事务、外键、触发器和下游系统都要纳入影响评估。

### 演练验证

演练要记录 RTO 和 RPO：多久能恢复，最多丢多少数据。还要验证备份文件可读、binlog 连续、权限可用、恢复脚本可重复执行。真正事故时，手册比临场发挥可靠。

<!-- id: java-mysql-053; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# DDL 变更为什么有风险，online DDL、gh-ost、pt-osc 如何选择？

### DDL 为什么危险

DDL 会拿元数据锁。哪怕 online DDL 本身能并发读写，也可能因为前面有长事务，导致 DDL 等 MDL；DDL 等待期间，后续普通查询也可能排队，最终把业务打满。

大表 DDL 还可能带来磁盘空间翻倍、redo/binlog 暴涨、复制延迟、buffer pool 抖动和回滚困难。

### online DDL

MySQL 原生 online DDL 适合风险较低、版本支持良好的变更。要看 ALGORITHM 和 LOCK 实际是否能做到 inplace/instant，以及是否会重建表。

~~~sql
alter table user add column ext varchar(64), algorithm=instant;
~~~

### gh-ost 和 pt-osc

两者都是影子表思路：创建新表，增量同步原表变更，最后切换表名。pt-osc 使用触发器捕获变更；gh-ost 通过 binlog 追增量，对主库侵入通常更小。

### 选择建议

小表或 instant 支持的变更优先原生 DDL。大表加索引、改列类型、重建表，要评估 gh-ost/pt-osc。变更前检查长事务、磁盘、复制延迟、外键、触发器和回滚方案；变更中设置限速和暂停条件。

<!-- id: java-mysql-054; difficulty: 3; tags: MySQL, MySQL日志与高可用; source: 精选 -->
# 分库分表、分区表和归档策略分别适合什么规模问题？

### 分库分表

分库分表解决单库单表容量、写入吞吐、索引高度和维护窗口问题。它的代价很大：跨分片查询、跨分片事务、全局唯一 ID、分页排序、扩容迁移都会变复杂。只有单表数据量、写入量或存储已经接近瓶颈时才值得做。

### 分区表

分区表仍在同一个 MySQL 实例里，适合按时间或范围管理大表，例如按月删除历史数据、按时间裁剪查询范围。它不能解决单实例写入瓶颈，也不能替代分库。分区键如果没有进入查询条件，效果会很差。

### 归档

归档解决冷热数据混在一起的问题。把低频历史数据迁到归档表、归档库或离线存储，可以缩小在线表和索引，降低备份、DDL 和查询成本。

### 怎么判断

先做归档和索引治理，再考虑分区，最后才是分库分表。分库分表前要明确分片键、查询模式、扩容方案、数据迁移、全局唯一约束和灰度回滚。很多系统的问题不是表不够分，而是历史数据不该继续留在在线热表。

<!-- id: java-mysql-055; difficulty: 2; tags: MySQL, MySQL优化; source: 精选 -->
# 慢查询治理应该如何从采集、归因到改写闭环？

### 先把慢查询采准

慢查询治理第一步是采集真实 SQL，而不是凭印象改索引。打开 slow log，记录 query_time、lock_time、rows_examined、rows_sent、执行频次，并按 SQL 指纹聚合。偶发 5 秒和每秒 200 次的 100 毫秒，优先级不同。

### 再判断慢在哪里

看 EXPLAIN/EXPLAIN ANALYZE、执行计划、扫描行数、锁等待、返回行数和调用链。SQL 慢可能是没走索引，也可能是返回太多、排序临时表、锁等待、连接池耗尽或下游处理慢。

### 改写手段

常见优化包括补联合索引、改写函数条件、拆 OR 为 UNION ALL、避免深分页、减少 SELECT *、把大事务拆批、让排序和过滤匹配同一个索引。改写后要用接近线上数据量验证。

### 闭环

上线前记录基线，上线后观察 P95/P99、rows_examined、慢查询数量、CPU、IO、锁等待和复制延迟。优化不是“加一个索引就完了”，还要确认没有拖慢写入和其他查询。

<!-- id: java-mysql-056; difficulty: 2; tags: MySQL, MySQL优化, 缓存, 性能; source: 精选 -->
# InnoDB 缓存和写优化机制如何影响性能？

### Buffer Pool

InnoDB Buffer Pool 缓存数据页和索引页。读请求先查缓存，未命中才读磁盘；写请求通常先改内存页，变成脏页，之后异步刷盘。热点数据能否留在 Buffer Pool，直接影响查询延迟。

### Change Buffer

对非唯一二级索引的写入，如果目标页不在内存，InnoDB 可以先把变更记到 change buffer，等页面以后读入时再合并。它能减少随机 IO，但对唯一索引不适用，因为唯一性检查必须确认是否冲突。

### redo 和刷脏

写入先落 redo，数据页可以稍后刷盘。redo 顺序写比随机刷数据页便宜，所以事务提交不需要同步刷所有脏页。但 redo 空间逼近上限、脏页太多或 checkpoint 推进慢时，会触发更强刷盘，导致延迟抖动。

### 自适应哈希和预读

自适应哈希索引可能加速热点等值查询，但在某些高并发场景也会有竞争。预读适合顺序扫描，但错误预读会挤占缓存。

### 调优重点

关注 buffer pool 命中率、脏页比例、redo 写入、fsync、刷脏速度和 IO 延迟。不要只调一个参数，要结合工作负载判断是缓存不够、写入太猛，还是 SQL 扫描了太多页。

<!-- id: java-mysql-057; difficulty: 2; tags: MySQL, MySQL优化; source: 精选 -->
# 如何判断瓶颈在 CPU、IO、锁等待、连接数还是 SQL 计划？

### 先分清等待类型

MySQL 变慢时，不要先猜索引。先看 CPU、IO、锁、连接和执行计划分别有没有异常。

| 现象 | 常见判断 |
| --- | --- |
| CPU 高 | 大量扫描、排序、函数计算、并发查询过多 |
| IO 高 | Buffer Pool 命中差、刷脏重、临时表落盘、大查询扫盘 |
| 锁等待高 | 热点行、长事务、范围锁、DDL 元数据锁 |
| 连接数高 | 慢 SQL 堆积、连接池过大、应用泄漏连接 |
| 计划异常 | 统计信息过旧、索引选择错误、数据分布变化 |

### 排查顺序

先看实例级指标：QPS、TPS、CPU、IOPS、磁盘延迟、连接数、线程状态、复制延迟。再看 SQL 级：慢日志、performance_schema、EXPLAIN ANALYZE。最后回到业务链路，看是不是某个接口流量突增。

### 典型误判

CPU 高不一定要加机器，可能是索引失效扫太多行。IO 高不一定是磁盘差，可能是查询无法命中缓存。连接数满不一定是连接太少，可能是前面的锁等待把连接占住了。

### 输出结论

一次排查要给出“瓶颈证据 + 根因 SQL/事务 + 改动方案 + 验证指标”。只说数据库慢，没有工程价值。

<!-- id: java-mysql-058; difficulty: 3; tags: MySQL, MySQL优化; source: 精选 -->
# 连接池参数、最大连接数和线程模型如何影响 MySQL 稳定性？

### 连接不是越多越好

MySQL 每个连接都要占内存和线程调度资源。max_connections 调得很大，可以减少连接被拒绝，但如果慢 SQL 或锁等待堆积，更多连接只会让数据库同时承受更多工作，延迟更高。

### 连接池参数

应用连接池要限制最大连接数、最小空闲、获取连接超时、空闲回收和连接存活检测。多个应用实例的连接池相加，不能超过 MySQL 可承受并发。

例如 20 个应用实例，每个最大 100 连接，就是 2000 个潜在连接。即使 max_connections 允许，数据库也未必扛得住 2000 个活跃查询。

### 线程模型

MySQL 传统是一连接一线程。大量连接活跃时，线程切换和内存压力会上升。商业版线程池或代理层可以缓解部分问题，但根因仍是并发请求、慢查询和事务持锁时间。

### 稳定性做法

连接池要有排队和快速失败策略，避免流量尖峰把数据库打穿。数据库侧监控 Threads_connected、Threads_running、Aborted_connects、连接使用率和慢查询堆积。容量规划时按活跃查询能力设连接池，而不是按应用线程数随手配置。

<!-- id: java-mysql-059; difficulty: 3; tags: MySQL, MySQL优化, 索引, 事务; source: 精选 -->
# 热点行、热点索引页和大事务如何导致性能抖动？

### 热点行

很多事务同时更新同一行，就会串行等待。例如秒杀库存行、全局计数器、账户余额。即使 SQL 很快，排队也会让 P99 抖动。

常见处理是条件更新、库存分桶、异步聚合、减少单行计数，或把强一致热点拆成更小粒度。但资金余额这类不能随意拆的场景，要接受串行并控制并发。

### 热点索引页

自增主键让插入集中在 B+ 树右侧，通常比随机写友好，但极端并发下右侧页可能成为热点。二级索引如果很多记录写入同一个前缀，也会形成页竞争。随机 UUID 会分散热点，却带来页分裂和缓存命中下降。

### 大事务

大事务会持有大量锁、产生大量 undo/redo/binlog，提交和回滚都慢，还会拖累复制。一次更新百万行，即使单条 SQL 看着简单，也可能造成长时间抖动。

### 处理原则

热点行靠业务拆分和限流，大事务靠分批提交，热点索引页靠主键和索引设计权衡。不要只看平均耗时，热点问题最明显的指标是锁等待、P99、复制延迟和偶发超时。

<!-- id: java-mysql-060; difficulty: 3; tags: MySQL, MySQL优化; source: 精选 -->
# MySQL 容量规划需要关注哪些核心指标和增长模型？

### 容量规划看哪些指标

MySQL 容量不是只看磁盘剩余。至少要看数据量、索引量、QPS/TPS、读写比例、Buffer Pool 命中率、CPU、IOPS、磁盘延迟、redo/binlog 生成速度、连接数、锁等待、复制延迟和备份恢复时间。

### 增长模型

按业务量建模型：每天新增多少用户、订单、流水、日志；每条记录平均多大；索引放大多少；保留多久；峰值流量是平均值的几倍。再估算一年后的数据、写入和查询压力。

例如订单表每天新增 500 万行，单行含索引平均 1 KB，一年就是约 1.8 TB。还要计算 binlog、备份、临时空间和 DDL 额外空间，不能只按数据文件算。

### 阈值和动作

容量规划要提前定义动作：什么时候归档，什么时候分区，什么时候加只读实例，什么时候拆库，什么时候升级硬件。等磁盘 90%、备份超过窗口、DDL 做不完时再处理，风险已经很高。

### 验证方式

用压测和历史趋势验证模型。重点看峰值下 P95/P99、刷脏、复制延迟和恢复时间。容量规划的目标不是把资源用满，而是给增长、故障切换和维护操作留余量。
