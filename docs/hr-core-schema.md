# vibeHR 核心模块 Schema 说明（Organizations / Positions / Employees）

> **本文反映"组织任职/个人基本信息重命名 + 加班审批 m2m 折叠"之后的最终当前 schema**。数据模型采用 **主表 + 版本表（Master + Version）** 的"时间轴"模式（与 SAP HCM / 用友 NC / 金蝶同源）：主表存稳定身份，版本表存按 `effectiveDate` 生效的历史快照；任意时间点的组织/任职/档案状态可重建。
> 员工档案采用 **SAP infotype 模型**：每个数据组是一条**独立按生效日期管理**的时间轴，互不耦合；"换岗"不会切"个人基本信息"，"改手机号"不会新建"任职版本"。
> 下文行号对应当前 `prisma/schema.prisma`。

## 近期命名调整（便于对照旧代码/文档）
- `adhrs_employee_versions` → **`adhrs_employee_org_assignment`**（组织任职 infotype；SAP "Organizational Assignment" / 用友"组织任职"）。
- `adhrs_employee_person` → **`adhrs_employee_basic_info`**（个人基本信息 infotype）。
- `adhrs_employee_version_payment_final_approver_relation`（加班最终审批人 m2m）**已删除**，折叠为 `adhrs_employee_org_assignment.payment_final_approvers Json?`（`number[]` 员工 id 数组，本质是选人字段）。

## 共享审计字段（所有业务表共有，下文不逐行重复）
`createdAt DateTime`、`updatedAt DateTime`、`createdBy Int?`、`updatedBy Int?`；主表与版本表另含 `deletedAt DateTime?`；所有业务表含 `tenantId Int?`（预留多租户，当前不参与查询）。字典表（country / bank / currency / id_document_type / legal_entity_register_number_type / location / adhrs_hrs_contract_type）为全局共享，无 tenantId。

## 字段行为约束（跨表通用）
- **`code`（组织/职位/员工主表）**：由 [`adhrs_code_seq`](#adhrs_code_seq原子编码序列) `upsert + increment` 原子自增生成，并发安全；`@@unique`，永久不变。
- **生效日期型 infotype 的 `effectiveDate`/`effective_date`**：本员工内唯一，由 trigger `checkNoDuplicateEffectiveDate` 守卫。涉及：basic_info、bank_account、social_security、compensation、org_assignment。
- **唯一约束规则**：**硬删除的版本表**（org/position/employee versions）有 DB `@@unique([masterId, effectiveDate])`；**软删除的 infotype 子表**（basic_info/bank/social/compensation）**无 DB `@@unique`**，仅 trigger 守卫——因 Prisma 对 SQLite/MySQL 不可移植地支持 partial unique，软删除（`deletedAt`）与唯一约束无法兼得（否则软删后无法用同 effective_date 重建）。
- **`expirationDate`/`expiration_date`**：参与"当前版本"选择——过期（`< now`）的不再霸占当前。
- **枚举字段**（orgType / structureType / job_level / employment_type / gender / degree / marital_status / health_status / change_type / pay_type / relationship / certificate type 等）：由 [`validateEnum`](src/lib/validation.ts) 在 trigger 写入时校验。可选值见 [src/lib/types.ts](src/lib/types.ts)。
- **`id_document_number`**：存储时 uppercase 归一化；唯一性由 precheck 保证（消除 SQLite↔MySQL 大小写差异）。
- **`email`**：存储时 lowercase 归一化；唯一性由 precheck 保证。
- **层级（parentOrgId / parentPositionId）**：写入前 `checkNoHierarchyCycle` 防环路。
- **任职事件 `event_type`**：每个 `adhrs_employee_org_assignment` 版本必填事件类型（Onboard/Probation/Transfer/Promotion/SecondaryChange/Offboard/Retire/Rehire/Other），由 trigger `validateEnum` 校验；`createEmployee` 自动置首版本为 `Onboard`。`event_reason` 为可选子原因。

---

## 关系总览

```
                        adhrs_code_seq (原子编码序列，三模块共用)
                               │ upsert+increment 取号
        ┌──────────────────────┼───────────────────────┐
        ▼                      ▼                       ▼
 adhrs_organizations    adhrs_positions          adhrs_employees
   ▲ 主表                 ▲ 主表                  ▲ 主表（员工档案挂在它下面）
   │ 1:N                  │ 1:N                   │ 1:N（各 infotype 独立时间轴）
 adhrs_organization_   adhrs_position_         ┌── adhrs_employee_org_assignment   （组织任职 infotype；含 payment_final_approvers）
 versions              versions                ├── adhrs_employee_basic_info       （个人基本信息 infotype）
   │ parentOrgId          ├ orgId → org          ├── adhrs_employee_compensation     （薪酬 infotype）
   │ → org(自关联成树)     │ parentPositionId     ├── adhrs_employee_bank_account     （银行账户 infotype）
                        │   → position(自关联)    ├── adhrs_employee_social_security  （社保公积金 infotype）
                                                ├── adhrs_employee_family_member     （家庭成员；当前态）
                                                ├── adhrs_employee_emergency_contact （紧急联系人；当前态多行）
                                                ├── adhrs_employee_certificate       （证件/证照；事件）
                                                ├── adhrs_employee_education_background（教育；事件）
                                                ├── adhrs_employee_work_experience   （工作经历；事件）

  任职表 office/work_location_id → location；薪酬 currency_id → currency、bank_account_id → bank_account
  ⚠️ 所有层级/任职外键指向【主表】；"按时间点解析"靠读时助手（见末节），永不翻转外键。
```

**infotype 分类**：
- **生效日期型**（状态随时间变化，要历史 + 独立 currency）：`adhrs_employee_org_assignment`（任职）、`adhrs_employee_basic_info`、`adhrs_employee_compensation`、`adhrs_employee_bank_account`、`adhrs_employee_social_security`。
- **事件/当前态记录**（无"有效期"，是清单/事件，无 currency）：`adhrs_employee_family_member`、`adhrs_employee_emergency_contact`、`adhrs_employee_certificate`、`adhrs_employee_education_background`、`adhrs_employee_work_experience`。

---

## 1. Organizations 菜单

### `adhrs_organizations`（主表）— [schema.prisma:225](prisma/schema.prisma#L225)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| code | String | @@unique | 原子自增编码（永久不变，见 [`adhrs_code_seq`](#adhrs_code_seq原子编码序列)） |
| name | String | @index | 组织名称 |
| status | Boolean | @default(true) | 状态（默认 true） |
| structureType | String? | — | `'Business'` 业务架构 \| `'Administrative'` 行政架构（枚举校验） |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([code])`、`@@index([name])` | — |

### `adhrs_organization_versions`（版本表）— [schema.prisma:422](prisma/schema.prisma#L422)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| orgId | Int | FK→organizations.id（`orgVersions`） | 所属组织主表 |
| name | String | — | 组织名称（版本快照） |
| orgType | String? | 枚举校验 | `Office\|Business Unit\|Department\|Team` |
| parentOrgId | Int? | FK→organizations.id（自关联 `orgTree`） | 父组织，构成组织树（写入前防环路） |
| effectiveDate | DateTime | `@@unique([orgId, effectiveDate])` | 生效日期；本组织内唯一 |
| expirationDate | DateTime? | — | 失效日期；过期不再霸占当前版本 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([orgId, effectiveDate])`、`@@index([orgId, current_version])`、`@@index([effectiveDate])`、`@@index([parentOrgId])` | — |

---

## 2. Positions 菜单

### `adhrs_positions`（主表）— [schema.prisma:249](prisma/schema.prisma#L249)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| code | String | @@unique | 原子自增编码（永久不变，见 [`adhrs_code_seq`](#adhrs_code_seq原子编码序列)） |
| name | String | @index | 职位名称 |
| status | Boolean | @default(true) | 状态（默认 true） |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([code])`、`@@index([name])` | — |

### `adhrs_position_versions`（版本表）— [schema.prisma:449](prisma/schema.prisma#L449)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| positionId | Int | FK→positions.id（`positionVersions`） | 所属职位主表 |
| name | String | — | 职位名称（版本快照） |
| orgId | Int? | FK→organizations.id | 所属组织 |
| parentPositionId | Int? | FK→positions.id（自关联 `posTree`） | 上级职位，汇报线（防环路） |
| job_level | String? | 枚举校验 | `'L'\|'M'\|'H'\|'E'` 职级（兼作编码前缀） |
| effectiveDate | DateTime | `@@unique([positionId, effectiveDate])` | 生效日期；本职位内唯一 |
| expirationDate | DateTime? | — | 失效日期 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([positionId, effectiveDate])`、`@@index([positionId, current_version])`、`@@index([effectiveDate])`、`@@index([parentPositionId])` | — |

---

## 3. Employees 菜单（员工档案 = 主表 + 多个独立 infotype）

### `adhrs_employees`（主表）— [schema.prisma:187](prisma/schema.prisma#L187)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| code | String | @@unique | 原子自增编码（永久不变，见 [`adhrs_code_seq`](#adhrs_code_seq原子编码序列)） |
| name | String | @index | 员工姓名 |
| status | Boolean | @default(true) | 状态（默认 true） |
| hireDate | DateTime | NOT NULL | 入职日期（默认取首任职版本 effectiveDate） |
| employmentEndDate | DateTime? | — | 雇佣结束日期（离职/退休；**尚无写入流程**，留待后续） |
| userId | Int? | — | 预留鉴权关联（无 FK，v1 无 users 表） |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([code])`、`@@index([name])` | — |

### `adhrs_employee_org_assignment`（组织任职 infotype，原 `adhrs_employee_versions`）— [schema.prisma:368](prisma/schema.prisma#L368)
即"组织任职信息"：所属组织、岗位、汇报线、用工类型。与个人基本信息/薪酬等**互不耦合**。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employeeId | Int | FK→employees.id（`employeeVersions`） | 所属员工主表 |
| orgId | Int? | FK→organizations.id | 所属组织 |
| positionId | Int? | FK→positions.id（`positionRef`） | 主岗位 |
| secondaryPositionId | Int? | FK→positions.id（`empVerSecondaryPos`） | 兼任岗位 |
| reportToEmployeeId | Int? | FK→employees.id（`reportTo`） | 直接汇报对象 |
| operationalLeaderEmployeeId | Int? | FK→employees.id（`opLeader`） | 业务/运营负责人 |
| functionalLeaderEmployeeId | Int? | FK→employees.id（`funcLeader`） | 职能负责人 |
| office_location | String? | — | 办公地点（旧文本列，过渡保留） |
| work_location | String? | — | 工作地点（旧文本列，过渡保留） |
| office_location_id | Int? | FK→location.id（`empOfficeLocation`） | 办公地点（结构化） |
| work_location_id | Int? | FK→location.id（`empWorkLocation`） | 工作地点（结构化） |
| employment_type | String? | 枚举校验 | Full-time/Part-time/Contractor/Intern/Outsource |
| event_type | String? | 枚举校验 | 任职事件类型：Onboard/Probation/Transfer/Promotion/SecondaryChange/Offboard/Retire/Rehire/Other（入转调离入口；每版本必填，trigger 校验；首版本自动 Onboard） |
| event_reason | String? | — | 事件原因 / 子原因（如 辞职·合同到期·主动调动） |
| managing_people_or_not | Boolean | @default(false) | 是否带人 |
| **payment_final_approvers** | **Json?** | — | **加班最终审批人**：`number[]` 员工 id 数组（选人字段，原 m2m 表折叠而来；无 FK） |
| effectiveDate | DateTime | `@@unique([employeeId, effectiveDate])` | 生效日期；本员工内唯一 |
| expirationDate | DateTime? | — | 失效日期 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([employeeId, effectiveDate])`、`@@index([employeeId, current_version])`、`@@index([effectiveDate])` | — |

### `adhrs_employee_basic_info`（个人基本信息 infotype，原 `adhrs_employee_person`）— [schema.prisma:482](prisma/schema.prisma#L482)
独立生效日期时间轴（**已与任职解耦**：currency 由自身 effectiveDate+expirationDate 解析）。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| employee_version_id | Int? | FK→org_assignment.id | **出生溯源戳**：本记录创建时所属的任职版本 id（可空、`ON DELETE SET NULL`）；**不参与"当前版本"解析**（basic_info 靠自身 effectiveDate 解析）；合同人员关系解析兜底用，见 [uuidResolution.ts](src/lib/contract/uuidResolution.ts) |
| name | String | — | 姓名；**当前 basic_info 版本的姓名同步到主表 `employees.name`**（姓名唯一归 personal info 管，任职表不再存姓名） |
| local_language_name | String? | — | 本地语言名 |
| gender | String? | 枚举校验 | 性别 |
| birth_date | DateTime? | — | 生日 |
| email | String? | lowercase 归一化 | 邮箱（唯一性靠 precheck） |
| mobile_phone | String? | — | 手机号 |
| home_tel | String? | — | 家庭电话 |
| id_document_type_id | Int? | FK→id_document_type.id | 证件类型 |
| id_document_number | String? | uppercase 归一化、`@@index` | 证件号码（唯一性靠 precheck） |
| id_document_address | String? | — | 证件地址 |
| country_id | Int? | FK→country.id | 居留国 |
| nationality | String? | — | 民族或国籍 |
| photo_url | String? | — | 照片 |
| province | String? | — | 省 |
| city | String? | — | 市 |
| district | String? | — | 区 |
| home_address_details | String? | — | 家庭地址详情 |
| mailing_address | String? | — | 通讯地址 |
| hukou_location | String? | — | 户籍所在地 |
| place_of_birth | String? | — | 出生地 |
| marital_status | String? | 枚举校验 | 婚姻状况 |
| health_status | String? | 枚举校验 | 健康状况 |
| degree | String? | 枚举校验 | 学历 |
| emergency_contact_name | String? | **@deprecated** | 改用 `adhrs_employee_emergency_contact`（多行） |
| emergency_contact_phone | String? | **@deprecated** | 改用 `adhrs_employee_emergency_contact`（多行） |
| emergency_contact_relationship | String? | **@deprecated** | 改用 `adhrs_employee_emergency_contact`（多行） |
| current_version | Boolean | @default(false) | 当前版本标志 |
| effectiveDate | DateTime | NOT NULL | 生效日期（本员工内唯一，trigger 守卫） |
| expirationDate | DateTime? | — | 失效日期 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id, current_version])`、`@@index([id_document_number])` | — |

### `adhrs_employee_compensation`（薪酬 infotype）— [schema.prisma:756](prisma/schema.prisma#L756)
独立生效日期时间轴；记录薪资历史。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| employee_version_id | Int? | FK→org_assignment.id | **出生溯源戳**：本记录创建时所属的任职版本 id（可空、`ON DELETE SET NULL`）；**不参与"当前版本"解析**，仅审计溯源 |
| bank_account_id | Int? | FK→bank_account.id | 发放账户 |
| currency_id | Int? | FK→currency.id | 币种 |
| pay_type | String? | 枚举校验 | Monthly/Annual/Hourly/Piece/Other |
| pay_grade | String? | — | 薪等 |
| pay_level | String? | — | 薪级 |
| base_salary | Decimal? | — | 基本工资（Decimal，双库均支持；JSON 序列化为字符串） |
| allowances | Json? | — | 津贴明细 `[{name, amount, type}]` |
| effective_date | DateTime | NOT NULL | 生效日期（本员工内唯一，trigger 守卫） |
| expiration_date | DateTime? | — | 失效日期 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| attachment | Json? | — | 附件 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id, current_version])` | **无 `@@unique`**；软删除表靠 trigger 守卫，见"唯一约束规则" |

### `adhrs_employee_family_member`（家庭成员/社会关系；当前态记录）— [schema.prisma:792](prisma/schema.prisma#L792)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| id_document_type_id | Int? | FK→id_document_type.id | 证件类型 |
| name | String | — | 姓名 |
| relationship | String? | 枚举校验 | Spouse/Parent/Child/Sibling/Relative/Other |
| gender | String? | 枚举校验 | 性别 |
| birth_date | DateTime? | — | 生日 |
| id_document_number | String? | — | 证件号码 |
| is_dependent | Boolean | @default(false) | 是否受抚养（→ 个税专项附加扣除） |
| cohabiting | Boolean | @default(false) | 是否同住 |
| employer | String? | — | 工作单位 |
| phone | String? | — | 电话 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id])` | — |

### `adhrs_employee_emergency_contact`（紧急联系人；当前态多行）— [schema.prisma:824](prisma/schema.prisma#L824)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| name | String | — | 姓名 |
| relationship | String? | — | 与员工关系 |
| phone | String? | — | 电话 |
| email | String? | lowercase 归一化 | 邮箱 |
| is_primary | Boolean | @default(false) | 是否首选联系人 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id])` | — |

### `adhrs_employee_certificate`（证件/证照；事件型带 issue/expiry）— [schema.prisma:850](prisma/schema.prisma#L850)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| country_id | Int? | FK→country.id | 签发国 |
| type | String? | 枚举校验 | Passport/Qualification/DriverLicense/Degree/Other |
| name | String? | — | 证件/证照名称 |
| number | String? | — | 证件号码 |
| issue_date | DateTime? | — | 签发日期 |
| expiry_date | DateTime? | — | 到期日期 |
| issuing_authority | String? | — | 签发机构 |
| attachment | Json? | — | 附件 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id, expiry_date])` | 便于到期提醒 |

### 其余员工子表

#### `adhrs_employee_bank_account`（银行账户 infotype）— [schema.prisma:537](prisma/schema.prisma#L537)
独立生效日期时间轴（本员工内唯一）；薪资发放账户。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| employee_version_id | Int? | FK→org_assignment.id | **出生溯源戳**：本记录创建时所属的任职版本 id（可空、`ON DELETE SET NULL`）；**不参与"当前版本"解析**，仅审计溯源 |
| account_holder_name | String | NOT NULL | 账户持有人姓名（必填） |
| bank_id | Int? | FK→bank.id | 银行 |
| currency_id | Int? | FK→currency.id | 币种 |
| country_id | Int? | FK→country.id | 开户国 |
| effective_date | DateTime | NOT NULL | 生效日期（本员工内唯一，trigger 守卫） |
| expiration_date | DateTime? | — | 失效日期 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| attachment | Json? | — | 附件 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id, current_version])` | — |

#### `adhrs_employee_social_security`（社保公积金 infotype）— [schema.prisma:567](prisma/schema.prisma#L567)
独立生效日期时间轴。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| employee_version_id | Int? | FK→org_assignment.id | **出生溯源戳**：本记录创建时所属的任职版本 id（可空、`ON DELETE SET NULL`）；**不参与"当前版本"解析**，仅审计溯源 |
| sscn | String? | `@@index` | 社保号 |
| hpf_account | String? | — | 公积金账户 |
| title | String? | — | 称谓 |
| spouse | String? | — | 配偶姓名 |
| spouse_id_number | String? | — | 配偶证件号 |
| first_time_to_check_social_insurance | Boolean | @default(false) | 是否首次核对社保 |
| effective_date | DateTime | NOT NULL | 生效日期（本员工内唯一，trigger 守卫） |
| expiration_date | DateTime? | — | 失效日期 |
| current_version | Boolean | @default(false) | 当前版本标志 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |
| 约束/索引 | — | `@@index([employee_id, current_version])`、`@@index([sscn])` | — |

#### `adhrs_employee_education_background`（教育；事件型）— [schema.prisma:595](prisma/schema.prisma#L595)
事件日志，**无 employee_version_id**，只挂 employee_id。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| degree | String? | — | 学位 |
| major | String? | — | 主修 |
| minor | String? | — | 辅修 |
| school_name | String? | — | 学校 |
| start_date | DateTime? | — | 开始日期 |
| end_date | DateTime? | — | 结束日期 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |

#### `adhrs_employee_work_experience`（工作经历；事件型）— [schema.prisma:616](prisma/schema.prisma#L616)
事件日志，**无 employee_version_id**，只挂 employee_id。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| employee_id | Int | FK→employees.id | 所属员工 |
| company_name | String? | — | 公司名称 |
| job_title | String? | — | 职位 |
| start_date | DateTime? | — | 开始日期 |
| end_date | DateTime? | — | 结束日期 |
| leave_reason | String? | — | 离职原因 |
| deletedAt | DateTime? | — | 软删除 |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + tenantId |

- ~~`adhrs_employee_version_payment_final_approver_relation`~~（**已删除**）：加班最终审批人折叠为 `adhrs_employee_org_assignment.payment_final_approvers`（见上）。
- ~~`adhrs_employee_change_record`~~（**已删除**）：任职事件改由 `adhrs_employee_org_assignment.event_type` + `event_reason` 承载（每版本自带事件，时间轴自描述）。

---

## 支撑表（被三模块引用）

### `adhrs_code_seq`（原子编码序列）— [schema.prisma:314](prisma/schema.prisma#L314)
组织/职位/员工编码统一从此取号：`upsert + { increment: 1 }` 原子自增，并发安全。
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| codeType | String | `@@unique([codeType, prefix])` | `orgCode` / `employeeCode` / `positionCode` |
| prefix | String | `@@unique([codeType, prefix])` | 编码前缀 |
| lastSeq | Int | @default(0) | 当前序号（`upsert + increment` 原子自增） |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([codeType, prefix])` | 每个(类型,前缀)独立计数 |

### `adhrs_system_state`（KV 存储）— [schema.prisma:294](prisma/schema.prisma#L294)
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | Int | @id @default(autoincrement()) | 主键 |
| state_key | String | @@unique | 键 |
| state_value | Json | — | 值（任意 JSON） |
| + 审计字段 | — | — | createdAt / updatedAt / createdBy Int? / updatedBy Int? + deletedAt + tenantId |
| 约束/索引 | — | `@@unique([state_key])` | 编码计数已迁出至 adhrs_code_seq；现为遗留/通用 KV |

### 被引用的字典表（全局，无 tenantId）
- [`location`](prisma/schema.prisma#L137)（自关联树）← 任职表 office/work_location_id
- [`country`](prisma/schema.prisma#L40) ← basic_info / bank_account / certificate 的 country_id
- [`id_document_type`](prisma/schema.prisma#L101) ← basic_info / family_member 的 id_document_type_id
- [`bank`](prisma/schema.prisma#L64) / [`currency`](prisma/schema.prisma#L83) ← bank_account / compensation

---

## 时间轴 / 历史重建（查询时解析）

本系统是"时间轴" HR 系统：所有记录按生效日期区间生效，可重建任意时间点的组织/任职/档案状态。

**所有层级/任职外键指向【主表】；"按时间点解析"靠读时助手，永不翻转外键。** 这与 SAP HCM（关系 infotype）/ 用友 / 金蝶的"按生效区间 join"一致，支持**追溯补录**（事后补录/更正某版本不会让既有引用变脏——没有冻结指针）。

读时助手（[src/lib/versioning/resolve.ts](src/lib/versioning/resolve.ts)，导出于 [versioning/index.ts](src/lib/versioning/index.ts)）：

| 助手 | 返回 | 用途 |
|---|---|---|
| `resolveVersionAt(kind, masterId, date)` | versionId \| null | org/position/employee 通用：当时生效的版本 id |
| `resolveOrgVersionAt(orgId, date)` | org 版本行 | 组织当时的版本（含 name/parentOrgId） |
| `resolvePositionVersionAt(positionId, date)` | position 版本行 | 职位当时的版本 |
| `resolveOrgAssignmentAt(employeeId, date)` | 任职版本行 | 任职当时版本（org/position/汇报线主表 id） |
| `resolveBasicInfoAt(employeeId, date)` | basic_info 行 | 个人基本信息当时的版本 |
| `resolveCompensationAt(employeeId, date)` | compensation 行 | 薪酬当时的版本 |
| `buildOrgTreeAtDate(date)` | 节点数组 | 重建"截至 date"的组织树 |

解析规则：`pickByEffectiveDate(items, getEff, getExp, date)` —— `effectiveDate ≤ date` 且（`expirationDate` 为空或 `≥ date`）的最新版本。各 infotype 的"当前"由各自的 `setXxxCurrentVersion`（[src/lib/versioning/](src/lib/versioning/)）维护，并由每日自愈调度（[src/lib/scheduler/dailyVersionSwitch.ts](src/lib/scheduler/dailyVersionSwitch.ts)，按 infotype 分组顺序重算）刷新。

> 设计决策已记入项目记忆：**永不翻转版本外键**（time_axis_resolution_strategy）。员工档案采用独立 infotype 模型（org_assignment/basic_info/compensation/bank/social 各自独立时间轴，不耦合 org_assignment）。
