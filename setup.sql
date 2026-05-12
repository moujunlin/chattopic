-- ChatTopic: 想聊系统
-- 基于设计文档 chattopic_design.md 建表

-- 星座（先建，cards 引用它）
CREATE TABLE chattopic_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text NOT NULL DEFAULT 'lori' CHECK (created_by IN ('maomao', 'lori')),
  created_at timestamptz DEFAULT now()
);

-- 卡片
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

-- 关系（卡片之间的连线）
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

-- 暗星（未激活的话题种子）
CREATE TABLE chattopic_dark_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  constellation_id uuid REFERENCES chattopic_constellations(id),
  suggested_by uuid REFERENCES chattopic_cards(id),
  status text DEFAULT 'dark' CHECK (status IN ('dark', 'activated')),
  activated_card_id uuid REFERENCES chattopic_cards(id),
  created_at timestamptz DEFAULT now()
);
