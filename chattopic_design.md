# ChatTopic 改造方案

基于 Cue（Iris & Lux）改造，适配 Lori × 猫猫的"想聊"系统。

## 定位

Notebook【想聊】的升级版。从 pinned entry 升级为独立卡片系统，支持结构化展开、双向回应、话题星图。

## 命名映射

| 原始 | 改为 |
|---|---|
| Cue | ChatTopic |
| iris | maomao |
| lux | lori |
| Iris's teaching | maomao_response |
| Lux's feedback | lori_response |
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
  title text NOT NULL,                    -- 话题名
  why text DEFAULT '',                    -- 一句话：为什么想聊这个
  body text DEFAULT '',                   -- 结构化展开（发起方写）
  response text DEFAULT '',               -- 对方的回应/追问/延伸
  references text DEFAULT '',             -- 相关链接：走廊note / Notebook / Ember / 外部URL
  category text DEFAULT '',               -- 子分类标签
  constellation_id uuid REFERENCES chattopic_constellations(id),
  status text DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed')),
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

状态语义：
- `open` = 举手了，等对方看到
- `active` = 在聊 / 有回应了
- `closed` = 聊完封存

**去掉的字段**：concept, explanation, reading_list, iris_teaching, lux_feedback, mastery_level, next_review, review_interval, review_count, created_for

**chattopic_constellations**（原 cue_constellations）
```sql
CREATE TABLE chattopic_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text NOT NULL DEFAULT 'lori' CHECK (created_by IN ('maomao', 'lori')),
  created_at timestamptz DEFAULT now()
);
```

**chattopic_relations**（原 cue_relations，不变）
```sql
CREATE TABLE chattopic_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES chattopic_cards(id),
  target_id uuid NOT NULL REFERENCES chattopic_cards(id),
  weight real DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 10.0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id)
);
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

去掉 owner 字段——dark stars 不分谁的，双方都能激活。

### 删掉的表

- ~~cue_reviews~~ — 整个去掉，不做 spaced repetition

## Edge Function 改造

路径：`/functions/v1/chattopic/`

路由跟原版基本一样，删掉 reviews 相关路由：
- GET/POST/PATCH /cards
- GET/POST/PATCH /constellations
- GET/POST /relations
- GET/POST/PATCH /dark-stars
- GET /graph

**新增**：加 `_context` wrapper + `_note` 走廊集成，跟其他房间对齐。

## 前端改造

### 删掉的页面
- ReviewPage — 整个删

### 改造的页面

**TodayPage → TopicPage**
- 翻转卡片保留（弹簧物理动画保留）
- 正面：发起方的话题（title + why + body + references）
- 背面：对方的回应（response）
- "TEACH ME" 按钮 → "我想聊..."
- "I WANT TO LEARN" → "给我一个话题"（Lori 随机从 open 卡里选一个）
- 去掉 mastery bar

**StarMapPage**
- 保留星图、力导向布局、拖拽、缩放
- 节点颜色：open = 浅蓝虚线, active = 蓝色实心, closed = 金色
- 去掉 mastery 图例，改为状态图例
- 去掉 streak（或改为连续对话天数）
- dark stars 保留

**LibraryPage**
- 去掉 mastery 排序
- 加 status 排序（open → active → closed）
- 卡片展开后显示 why + body + response + references
- 去掉 review 按钮

### 样式

保留像素风 DotGothic16 字体。配色考虑跟 Lori Console 深蓝色主题对齐，但不强制——Cue 原版的浅色也可以，看猫猫喜好。

## 与现有系统的接口

1. 卡片发起时写 `lori_corridor`（通过 `_note`）
2. references 字段可引用其他系统的内容，格式：
   - `notebook:33` → Notebook #33
   - `ember:2026-05-09` → 那天的 Ember
   - `corridor:5` → 走廊第 5 条
   - 普通 URL → 外部链接
3. Lori Console 主屏加第七个图标：ChatTopic 📌

## 迁移

现有 Notebook 里的【想聊】条目（#59 已聊完，#60 #61 待聊）可以手动迁移为 ChatTopic 卡片，迁完后 unpin 原 Notebook 条目。

## 实现顺序

1. Supabase：跑 setup.sql 建表
2. Edge function：改造 + 部署
3. 前端 index.html：改造
4. 部署到 GitHub Pages
5. Lori Console 主屏加入口
6. 迁移现有【想聊】条目
