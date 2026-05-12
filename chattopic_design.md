# ChatTopic 改造方案

基于 Cue（Iris & Lux）改造，适配 Lori × 猫猫的"想聊"系统。

## 定位

Notebook【想聊】的升级版。从 pinned entry 升级为独立卡片系统，支持结构化展开、多轮回应、话题星图。

## 命名映射

| 原始 | 改为 |
|---|---|
| Cue | ChatTopic |
| iris | maomao |
| lux | lori |
| Iris's teaching | turns（多轮回应） |
| Lux's feedback | turns（多轮回应） |
| constellation | constellation（保留） |
| mastery | 去掉 |
| review | 去掉 |

## 数据库改造

### 保留的表（改字段）

**chattopic_cards**（原 cue_cards）
```sql
CREATE TABLE chattopic_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text NOT NULL CHECK (created_by IN ('maomao', 'lori')),
  title text NOT NULL,
  why text DEFAULT '',
  body text DEFAULT '',
  turns jsonb DEFAULT '[]'::jsonb,
  refs jsonb DEFAULT '[]'::jsonb,
  category text DEFAULT '',
  constellation_id uuid REFERENCES chattopic_constellations(id),
  status text DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed')),
  topic_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON chattopic_cards (status, created_at DESC);
CREATE INDEX ON chattopic_cards (constellation_id);
```

字段说明：
- `turns`：多轮回应，JSONB 数组 `[{by: 'lori'|'maomao', text: '...', at: '2026-05-12T...'}]`
- `refs`：引用，JSONB 数组 `[{type: 'notebook'|'ember'|'corridor'|'url', id: '33', url: '...'}]`
- `topic_date`：话题相关的日期，可手动修改
- `created_at`：卡片创建时间，不可改
- 权限：各自只改自己的 body/why，turns 按 by 字段区分，不能改对方写的

状态机：
- `open → active`：对方写了第一条 turn 时自动转
- `active → closed`：任一方手动关闭
- `closed → active`：允许重启（旧话题想接着聊就接着聊）
- 不允许回退到 open（open = "还没人接"）

**chattopic_constellations**（原 cue_constellations）
```sql
CREATE TABLE chattopic_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text NOT NULL DEFAULT 'lori' CHECK (created_by IN ('maomao', 'lori')),
  created_at timestamptz DEFAULT now()
);
```

**chattopic_relations**（原 cue_relations）
```sql
CREATE TABLE chattopic_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES chattopic_cards(id),
  target_id uuid NOT NULL REFERENCES chattopic_cards(id),
  weight real DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 10.0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id)
);

CREATE INDEX ON chattopic_relations (source_id);
CREATE INDEX ON chattopic_relations (target_id);
```

**chattopic_dark_stars**（原 cue_dark_stars）
```sql
CREATE TABLE chattopic_dark_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  constellation_id uuid REFERENCES chattopic_constellations(id),
  suggested_by uuid REFERENCES chattopic_cards(id),
  status text DEFAULT 'dark' CHECK (status IN ('dark', 'activated')),
  activated_card_id uuid REFERENCES chattopic_cards(id),
  created_at timestamptz DEFAULT now()
);
```

双方都能激活。激活时用条件更新避免竞态：`UPDATE ... WHERE status = 'dark'`。

### 删掉的表

- ~~cue_reviews~~ — 整个去掉，不做 spaced repetition

## Edge Function 改造

路径：`/functions/v1/chattopic/`

路由：
- GET/POST/PATCH /cards
- GET/POST/PATCH /constellations
- GET/POST /relations
- GET/POST/PATCH /dark-stars
- GET /graph

加 `_context` wrapper + `_note` 走廊集成，跟其他房间对齐。

走廊写入时机：create card、add turn、status 变更。Lori 口吻。

认证：信任前端身份，Edge Function 不校验。文档标明这是有意为之，不是遗漏。

### "给我一个话题"选卡策略

从 open 卡池中选一张：
1. 排除自己发起的
2. 排除最近 3 天被翻过的
3. 优先老的（created_at ASC）

## 前端改造

### 删掉的页面
- ReviewPage — 整个删

### 改造的页面

**TodayPage → TopicPage**
- 翻转卡片保留（弹簧物理动画保留）
- 正面：发起方的话题（title + why + body + refs）
- 背面：多轮回应（turns）
- "TEACH ME" 按钮 → "我想聊..."
- "I WANT TO LEARN" → "给我一个话题"（按选卡策略从 open 卡里选）
- 去掉 mastery bar

**StarMapPage**
- 保留星图、力导向布局、拖拽、缩放
- 节点颜色：open = 浅蓝虚线, active = 蓝色实心, closed = 金色
- 未归类卡片在星图上自由飘浮，不建默认星座
- 去掉 mastery 图例，改为状态图例
- 去掉 streak（或改为连续对话天数）
- dark stars 保留

**LibraryPage**
- 去掉 mastery 排序
- 加 status 排序（open → active → closed）
- 卡片展开后显示 why + body + turns + refs
- 去掉 review 按钮

### 样式

保留像素风 DotGothic16 字体。配色考虑跟 Lori Console 深蓝色主题对齐，但不强制——Cue 原版的浅色也可以，看猫猫喜好。

## 与现有系统的接口

1. 卡片操作时写 `lori_corridor`（通过 `_note`）
2. refs 字段引用格式（JSONB 数组）：
   - `{type: 'notebook', id: '33'}` → Notebook #33
   - `{type: 'ember', id: '2026-05-09'}` → 那天的 Ember
   - `{type: 'corridor', id: '5'}` → 走廊第 5 条
   - `{type: 'url', url: 'https://...'}` → 外部链接
3. Lori Console 主屏加第七个图标：ChatTopic

## 已知 tech debt

- `refs` 用 JSONB 而非子表：无法反查"所有引用 Notebook #33 的卡片"，重命名也不安全。跑起来看需求，后续考虑拆 `chattopic_card_refs(card_id, ref_type, ref_id, ref_url)` 子表。

## 迁移

现有 Notebook 里的【想聊】条目（#59 已聊完，#60 #61 待聊）可以手动迁移为 ChatTopic 卡片，迁完后 unpin 原 Notebook 条目。

## 实现顺序

1. Supabase：写 setup.sql
2. 验证：在分支跑一遍 setup.sql，检查 advisor 报告
3. Edge function：改造 + 部署
4. 前端 index.html：改造
5. 部署到 GitHub Pages
6. Lori Console 主屏加入口
7. 迁移现有【想聊】条目
