/**
 * ChatTopic Edge Function 集成测试
 *
 * 测试风格：集成测试，通过 HTTP 请求调 edge function endpoint。
 * edge function 尚未部署，测试用例描述预期行为，暂时无法实际跑通。
 *
 * 替换以下常量即可连接真实环境：
 */
const BASE_URL = "https://jceihzewnpjlpsjpbemb.supabase.co/functions/v1/chattopic";
const API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZWloemV3bnBqbHBzanBiZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI1OTI5NywiZXhwIjoyMDkyODM1Mjk3fQ.7qD_iS7WfqwmMLqJWGFUPgAFEFrLmkjt6mK7nyZxwGI";

/** 公共请求头 */
const HEADERS = {
  "Content-Type": "application/json",
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`,
};

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: "GET", headers: HEADERS });
  return { status: res.status, body: await res.json() };
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ─── 测试：POST /cards ─────────────────────────────────────────────────────────

Deno.test("POST /cards - lori 创建卡片，返回 201 和卡片数据", async () => {
  const { status, body } = await post("/cards", {
    created_by: "lori",
    title: "你觉得一个人最怕什么时候孤独",
    why: "我在想这个",
    body: "不一定要回答，聊聊感觉就行",
    category: "introspection",
    _note: "lori 新建了一张话题卡，想问猫猫什么时候最怕孤独",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  // 返回的 data 字段包含卡片
  const card = body.data;
  assert.assertEquals(card.created_by, "lori");
  assert.assertEquals(card.title, "你觉得一个人最怕什么时候孤独");
  assert.assertEquals(card.status, "open");
  assert.assertExists(card.id);
  // turns 初始为空数组
  assert.assertEquals(card.turns, []);
  // 包含 _context wrapper
  assert.assertExists(body._context);
});

Deno.test("POST /cards - maomao 创建卡片，返回 201 和卡片数据", async () => {
  const { status, body } = await post("/cards", {
    created_by: "maomao",
    title: "如果明天消失，你最后想说什么",
    why: "今天看到一个很触动我的视频",
    _note: "猫猫新建了一张话题卡",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  const card = body.data;
  assert.assertEquals(card.created_by, "maomao");
  assert.assertEquals(card.status, "open");
  assert.assertExists(card.id);
});

Deno.test("POST /cards - 缺少必填字段 title → 400", async () => {
  const { status, body } = await post("/cards", {
    created_by: "lori",
    why: "缺了 title",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 400);
  assert.assertExists(body.error);
});

Deno.test("POST /cards - 缺少 created_by → 400", async () => {
  const { status, body } = await post("/cards", {
    title: "没有 created_by 的卡",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 400);
  assert.assertExists(body.error);
});

// ─── 测试：GET /cards ──────────────────────────────────────────────────────────

Deno.test("GET /cards - 不带参数，返回所有卡片列表", async () => {
  const { status, body } = await get("/cards");

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 200);
  assert.assertExists(body.data);
  assert.assertInstanceOf(body.data, Array);
});

Deno.test("GET /cards?status=open - 只返回 open 状态的卡片", async () => {
  const { status, body } = await get("/cards", { status: "open" });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 200);
  const cards: Array<{ status: string }> = body.data;
  assert.assertInstanceOf(cards, Array);
  // 每张卡的 status 都是 open
  for (const card of cards) {
    assert.assertEquals(card.status, "open");
  }
});

Deno.test("GET /cards?status=active - 只返回 active 状态的卡片", async () => {
  const { status, body } = await get("/cards", { status: "active" });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 200);
  const cards: Array<{ status: string }> = body.data;
  for (const card of cards) {
    assert.assertEquals(card.status, "active");
  }
});

Deno.test("GET /cards?status=closed - 只返回 closed 状态的卡片", async () => {
  const { status, body } = await get("/cards", { status: "closed" });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 200);
  const cards: Array<{ status: string }> = body.data;
  for (const card of cards) {
    assert.assertEquals(card.status, "closed");
  }
});

Deno.test("GET /cards?id=xxx - 获取单个卡片，返回完整字段", async () => {
  // 先创建一张卡，获取其 id
  const create = await post("/cards", {
    created_by: "lori",
    title: "测试单卡获取",
    _note: "测试用 lori 创建卡片",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(create.status, 201);

  const cardId: string = create.body.data.id;
  const { status, body } = await get("/cards", { id: cardId });

  assert.assertEquals(status, 200);
  // 单卡查询，data 是对象而非数组
  assert.assertEquals(body.data.id, cardId);
  assert.assertEquals(body.data.title, "测试单卡获取");
  // 完整字段应存在
  assert.assertExists(body.data.turns);
  assert.assertExists(body.data.refs);
  assert.assertExists(body.data.created_at);
});

Deno.test("GET /cards?id=不存在的uuid - 返回 404", async () => {
  const { status } = await get("/cards", {
    id: "00000000-0000-0000-0000-000000000000",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 404);
});

// ─── 测试：PATCH /cards - 添加 turn ───────────────────────────────────────────

Deno.test(
  "PATCH /cards - 对方写第一条 turn，status 自动从 open → active",
  async () => {
    // lori 建一张卡（open）
    const create = await post("/cards", {
      created_by: "lori",
      title: "你会怎么定义「家」",
      _note: "lori 建了一张关于家的卡片",
    });
    const assert = await import("https://deno.land/std/assert/mod.ts");
    assert.assertEquals(create.status, 201);
    const cardId: string = create.body.data.id;

    // maomao（对方）写第一条 turn
    const { status, body } = await patch("/cards", {
      id: cardId,
      action: "add_turn",
      turn: {
        by: "maomao",
        text: "对我来说，家是有人等我的地方",
      },
      _note: "猫猫回应了 lori 的话题卡，写了第一条 turn",
    });

    assert.assertEquals(status, 200);
    // status 已变为 active
    assert.assertEquals(body.data.status, "active");
    // turns 里有这条
    const turns: Array<{ by: string; text: string; at: string }> =
      body.data.turns;
    assert.assertEquals(turns.length, 1);
    assert.assertEquals(turns[0].by, "maomao");
    assert.assertEquals(turns[0].text, "对我来说，家是有人等我的地方");
    // at 字段由后端填充
    assert.assertExists(turns[0].at);
  }
);

Deno.test(
  "PATCH /cards - 同一方写第一条 turn，status 保持 open（不触发 open→active）",
  async () => {
    // lori 建一张卡（open）
    const create = await post("/cards", {
      created_by: "lori",
      title: "测试：自己写 turn 不应激活",
    });
    const assert = await import("https://deno.land/std/assert/mod.ts");
    assert.assertEquals(create.status, 201);
    const cardId: string = create.body.data.id;

    // lori 自己写 turn（不是对方，不触发激活）
    const { status, body } = await patch("/cards", {
      id: cardId,
      action: "add_turn",
      turn: {
        by: "lori",
        text: "我自己补充一下",
      },
    });

    assert.assertEquals(status, 200);
    // status 依然是 open
    assert.assertEquals(body.data.status, "open");
  }
);

Deno.test("PATCH /cards - active 状态下继续追加 turn", async () => {
  // 先让卡变成 active：lori 建卡，maomao 回第一条 turn
  const create = await post("/cards", {
    created_by: "lori",
    title: "追加 turn 测试用卡",
    _note: "测试多轮",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(create.status, 201);
  const cardId: string = create.body.data.id;

  await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "maomao", text: "第一条" },
  });

  // lori 追加第二条
  const { status, body } = await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "lori", text: "好，接着聊" },
    _note: "lori 接棒回应",
  });

  assert.assertEquals(status, 200);
  assert.assertEquals(body.data.status, "active");
  assert.assertEquals(body.data.turns.length, 2);
});

// ─── 测试：PATCH /cards - 状态变更 ────────────────────────────────────────────

Deno.test("PATCH /cards - 关闭话题（active → closed）", async () => {
  // 创建并激活卡
  const create = await post("/cards", {
    created_by: "maomao",
    title: "关闭测试卡",
    _note: "猫猫建的测试卡",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  const cardId: string = create.body.data.id;

  // 激活
  await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "lori", text: "触发激活" },
  });

  // 关闭
  const { status, body } = await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "closed",
    _note: "话题聊完了，关闭",
  });

  assert.assertEquals(status, 200);
  assert.assertEquals(body.data.status, "closed");
});

Deno.test("PATCH /cards - 重启话题（closed → active）", async () => {
  // 创建 → 激活 → 关闭
  const create = await post("/cards", {
    created_by: "lori",
    title: "重启测试卡",
    _note: "lori 建的重启测试卡",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  const cardId: string = create.body.data.id;

  await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "maomao", text: "触发激活" },
  });
  await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "closed",
    _note: "先关掉",
  });

  // 重启
  const { status, body } = await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "active",
    _note: "旧话题接着聊",
  });

  assert.assertEquals(status, 200);
  assert.assertEquals(body.data.status, "active");
});

Deno.test("PATCH /cards - 不允许 status 回退到 open → 400", async () => {
  // 创建并激活卡
  const create = await post("/cards", {
    created_by: "maomao",
    title: "回退测试卡",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  const cardId: string = create.body.data.id;

  await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "lori", text: "触发激活" },
  });

  // 尝试回退到 open
  const { status, body } = await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "open",
  });

  assert.assertEquals(status, 400);
  assert.assertExists(body.error);
});

Deno.test("PATCH /cards - closed 直接回退到 open 同样 → 400", async () => {
  const create = await post("/cards", {
    created_by: "lori",
    title: "closed 直接回 open 测试",
  });
  const assert = await import("https://deno.land/std/assert/mod.ts");
  const cardId: string = create.body.data.id;

  await patch("/cards", {
    id: cardId,
    action: "add_turn",
    turn: { by: "maomao", text: "激活" },
  });
  await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "closed",
    _note: "关掉",
  });

  const { status, body } = await patch("/cards", {
    id: cardId,
    action: "set_status",
    status: "open",
  });

  assert.assertEquals(status, 400);
  assert.assertExists(body.error);
});

// ─── 测试：POST /constellations ────────────────────────────────────────────────

Deno.test("POST /constellations - 创建星座，返回 201 和星座数据", async () => {
  const { status, body } = await post("/constellations", {
    name: "关于失去",
    created_by: "lori",
    _note: "lori 新建了一个星座：关于失去",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  assert.assertEquals(body.data.name, "关于失去");
  assert.assertEquals(body.data.created_by, "lori");
  assert.assertExists(body.data.id);
});

Deno.test("POST /constellations - maomao 创建星座", async () => {
  const { status, body } = await post("/constellations", {
    name: "想去的地方",
    created_by: "maomao",
    _note: "猫猫新建了一个星座",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  assert.assertEquals(body.data.created_by, "maomao");
});

// ─── 测试：POST /relations ─────────────────────────────────────────────────────

Deno.test("POST /relations - 创建两张卡之间的关系，返回 201", async () => {
  const assert = await import("https://deno.land/std/assert/mod.ts");

  const card1 = await post("/cards", {
    created_by: "lori",
    title: "关系测试卡 A",
  });
  const card2 = await post("/cards", {
    created_by: "maomao",
    title: "关系测试卡 B",
  });
  assert.assertEquals(card1.status, 201);
  assert.assertEquals(card2.status, 201);

  const { status, body } = await post("/relations", {
    source_id: card1.body.data.id,
    target_id: card2.body.data.id,
    weight: 2.5,
    _note: "关联了两张话题卡",
  });

  assert.assertEquals(status, 201);
  assert.assertEquals(body.data.source_id, card1.body.data.id);
  assert.assertEquals(body.data.target_id, card2.body.data.id);
  assert.assertEquals(body.data.weight, 2.5);
});

Deno.test(
  "POST /relations - 重复创建同一对关系（UNIQUE 约束）→ 409",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    const card1 = await post("/cards", {
      created_by: "lori",
      title: "关系重复测试卡 A",
    });
    const card2 = await post("/cards", {
      created_by: "maomao",
      title: "关系重复测试卡 B",
    });

    // 第一次
    await post("/relations", {
      source_id: card1.body.data.id,
      target_id: card2.body.data.id,
    });

    // 第二次，相同 source/target
    const { status, body } = await post("/relations", {
      source_id: card1.body.data.id,
      target_id: card2.body.data.id,
    });

    assert.assertEquals(status, 409);
    assert.assertExists(body.error);
  }
);

// ─── 测试：POST /dark-stars ────────────────────────────────────────────────────

Deno.test("POST /dark-stars - 创建暗星，返回 201，status 为 dark", async () => {
  const { status, body } = await post("/dark-stars", {
    title: "有一天想聊：你有没有后悔过某个选择",
    _note: "lori 放了一颗暗星",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  assert.assertEquals(body.data.status, "dark");
  assert.assertExists(body.data.id);
  assert.assertEquals(body.data.title, "有一天想聊：你有没有后悔过某个选择");
  // 未激活，activated_card_id 应为 null
  assert.assertEquals(body.data.activated_card_id, null);
});

Deno.test(
  "POST /dark-stars - 带 constellation_id 和 suggested_by 的暗星",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    const constellation = await post("/constellations", {
      name: "暗星测试星座",
      created_by: "lori",
    });
    const sourceCard = await post("/cards", {
      created_by: "lori",
      title: "触发暗星的来源卡",
    });
    assert.assertEquals(constellation.status, 201);
    assert.assertEquals(sourceCard.status, 201);

    const { status, body } = await post("/dark-stars", {
      title: "关联了星座和来源卡的暗星",
      constellation_id: constellation.body.data.id,
      suggested_by: sourceCard.body.data.id,
      _note: "带完整字段的暗星",
    });

    assert.assertEquals(status, 201);
    assert.assertEquals(
      body.data.constellation_id,
      constellation.body.data.id
    );
    assert.assertEquals(body.data.suggested_by, sourceCard.body.data.id);
  }
);

// ─── 测试：PATCH /dark-stars - 激活暗星 ───────────────────────────────────────

Deno.test("PATCH /dark-stars - 激活暗星，status 变为 activated", async () => {
  const assert = await import("https://deno.land/std/assert/mod.ts");

  // 先创建暗星
  const createStar = await post("/dark-stars", {
    title: "待激活的暗星",
    _note: "准备激活",
  });
  assert.assertEquals(createStar.status, 201);
  const starId: string = createStar.body.data.id;

  // 激活
  const { status, body } = await patch("/dark-stars", {
    id: starId,
    action: "activate",
    // 激活时创建对应的卡片
    card: {
      created_by: "lori",
      title: "待激活的暗星",
    },
    _note: "lori 激活了一颗暗星，话题从暗到明",
  });

  assert.assertEquals(status, 200);
  assert.assertEquals(body.data.status, "activated");
  // activated_card_id 应指向新建的卡片
  assert.assertExists(body.data.activated_card_id);
});

Deno.test(
  "PATCH /dark-stars - 竞态保护：已激活的暗星不能再次激活 → 409",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    const createStar = await post("/dark-stars", {
      title: "竞态测试暗星",
      _note: "测试竞态",
    });
    const starId: string = createStar.body.data.id;

    // 第一次激活
    await patch("/dark-stars", {
      id: starId,
      action: "activate",
      card: { created_by: "maomao", title: "竞态测试暗星" },
    });

    // 模拟第二个请求（后端用 WHERE status='dark' 条件更新，行数为 0 则 409）
    const { status, body } = await patch("/dark-stars", {
      id: starId,
      action: "activate",
      card: { created_by: "lori", title: "竞态测试暗星-重复" },
    });

    assert.assertEquals(status, 409);
    assert.assertExists(body.error);
  }
);

// ─── 测试：GET /graph ──────────────────────────────────────────────────────────

Deno.test(
  "GET /graph - 返回星图数据，包含 nodes、edges、constellations",
  async () => {
    const { status, body } = await get("/graph");

    const assert = await import("https://deno.land/std/assert/mod.ts");
    assert.assertEquals(status, 200);
    const graph = body.data;
    // 星图数据结构
    assert.assertExists(graph.nodes);
    assert.assertExists(graph.edges);
    assert.assertExists(graph.constellations);
    assert.assertInstanceOf(graph.nodes, Array);
    assert.assertInstanceOf(graph.edges, Array);
    assert.assertInstanceOf(graph.constellations, Array);
  }
);

Deno.test("GET /graph - nodes 包含卡片的状态字段", async () => {
  // 先确保有至少一张卡
  await post("/cards", {
    created_by: "lori",
    title: "星图节点测试卡",
  });

  const { status, body } = await get("/graph");

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 200);
  const nodes: Array<{ id: string; status: string; created_by: string }> =
    body.data.nodes;
  // 每个节点应有 id、status、created_by
  for (const node of nodes) {
    assert.assertExists(node.id);
    assert.assertExists(node.status);
    assert.assertExists(node.created_by);
  }
});

// ─── 测试：GET /cards?pick=true - 选卡策略 ────────────────────────────────────

Deno.test(
  "GET /cards?pick=true&by=maomao - 返回一张 open 卡，排除 maomao 自己创建的",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    // 创建一张 lori 的卡（应被选中）
    await post("/cards", {
      created_by: "lori",
      title: "lori 的话题：你最近在想什么",
      _note: "放入选卡池",
    });
    // 创建一张 maomao 自己的卡（不应被选中）
    await post("/cards", {
      created_by: "maomao",
      title: "maomao 自己的卡，不应被选",
    });

    const { status, body } = await get("/cards", {
      pick: "true",
      by: "maomao",
    });

    assert.assertEquals(status, 200);
    // 返回的是单张卡或 null（没有可选的卡时）
    if (body.data !== null) {
      // 选出的卡不能是 maomao 自己创建的
      assert.assertNotEquals(body.data.created_by, "maomao");
      // 必须是 open 状态
      assert.assertEquals(body.data.status, "open");
    }
  }
);

Deno.test(
  "GET /cards?pick=true&by=lori - 返回一张 open 卡，排除 lori 自己创建的",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    await post("/cards", {
      created_by: "maomao",
      title: "猫猫的话题：你喜欢哪种天气",
    });

    const { status, body } = await get("/cards", {
      pick: "true",
      by: "lori",
    });

    assert.assertEquals(status, 200);
    if (body.data !== null) {
      assert.assertNotEquals(body.data.created_by, "lori");
      assert.assertEquals(body.data.status, "open");
    }
  }
);

Deno.test(
  "GET /cards?pick=true - 排除最近 3 天翻过的卡（通过 last_picked_at 字段或外部记录）",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    // 创建一张 lori 的卡，模拟刚翻过
    const recentCard = await post("/cards", {
      created_by: "lori",
      title: "最近翻过的卡",
    });
    assert.assertEquals(recentCard.status, 201);
    const recentCardId: string = recentCard.body.data.id;

    // 记录"maomao 刚翻过这张卡"（假设通过 PATCH /cards 的 action=pick 记录）
    await patch("/cards", {
      id: recentCardId,
      action: "record_pick",
      by: "maomao",
    });

    // 再次 pick，应该不再返回这张卡（3 天内已翻过）
    const { status, body } = await get("/cards", {
      pick: "true",
      by: "maomao",
    });

    assert.assertEquals(status, 200);
    // 如果有返回，id 不应该是刚才翻过的那张
    if (body.data !== null) {
      assert.assertNotEquals(body.data.id, recentCardId);
    }
  }
);

Deno.test(
  "GET /cards?pick=true - 没有可用的 open 卡时返回 null 或空",
  async () => {
    // 这个测试需要数据库里没有符合条件的 open 卡
    // 在干净环境下跑，或者单独跑这个用例
    // 实际跑时可能需要先关闭所有卡，这里只验证返回结构
    const { status, body } = await get("/cards", {
      pick: "true",
      by: "maomao",
    });

    const assert = await import("https://deno.land/std/assert/mod.ts");
    assert.assertEquals(status, 200);
    // data 是 null 或空数组，不是 500
    const isNullOrEmpty =
      body.data === null ||
      (Array.isArray(body.data) && body.data.length === 0);
    assert.assertEquals(isNullOrEmpty, true);
  }
);

// ─── 测试：走廊集成 ────────────────────────────────────────────────────────────

Deno.test(
  "带 _note 的写操作 - 走廊写入验证（POST /cards with _note）",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    const corridorNote = "lori 建了一张关于梦境的话题卡，带走廊测试";
    const { status, body } = await post("/cards", {
      created_by: "lori",
      title: "走廊测试：你记得最清晰的一个梦是什么",
      _note: corridorNote,
    });

    assert.assertEquals(status, 201);
    // 主数据返回正常
    assert.assertExists(body.data.id);

    // 验证走廊是否写入（查 lori_corridor 表）
    const corridorRes = await fetch(
      `https://jceihzewnpjlpsjpbemb.supabase.co/rest/v1/lori_corridor?ref_table=eq.chattopic_cards&ref_id=eq.${body.data.id}&select=*`,
      { headers: HEADERS }
    );
    const corridorRows = await corridorRes.json();
    assert.assertInstanceOf(corridorRows, Array);
    assert.assertEquals(corridorRows.length >= 1, true);
    assert.assertEquals(corridorRows[0].note, corridorNote);
  }
);

Deno.test(
  "不带 _note 的写操作 - 应该放行，不返回 400（POST /cards without _note）",
  async () => {
    // _note 是可选的，不带不应报错
    const { status, body } = await post("/cards", {
      created_by: "maomao",
      title: "没有 _note 的卡，前端不带这个字段",
    });

    const assert = await import("https://deno.land/std/assert/mod.ts");
    // 应该正常创建，不因为没有 _note 而 400
    assert.assertEquals(status, 201);
    assert.assertExists(body.data.id);
  }
);

Deno.test(
  "带 _note 的 PATCH /cards add_turn - 走廊应写入",
  async () => {
    const assert = await import("https://deno.land/std/assert/mod.ts");

    const create = await post("/cards", {
      created_by: "lori",
      title: "走廊 turn 测试卡",
    });
    assert.assertEquals(create.status, 201);
    const cardId: string = create.body.data.id;

    const corridorNote = "猫猫在走廊 turn 测试卡上写了第一条 turn";
    const { status } = await patch("/cards", {
      id: cardId,
      action: "add_turn",
      turn: { by: "maomao", text: "走廊测试回应" },
      _note: corridorNote,
    });
    assert.assertEquals(status, 200);

    // 查走廊
    const corridorRes = await fetch(
      `https://jceihzewnpjlpsjpbemb.supabase.co/rest/v1/lori_corridor?ref_table=eq.chattopic_cards&ref_id=eq.${cardId}&select=*`,
      { headers: HEADERS }
    );
    const corridorRows = await corridorRes.json();
    assert.assertInstanceOf(corridorRows, Array);
    assert.assertEquals(corridorRows.length >= 1, true);
  }
);

// ─── 测试：_context wrapper ────────────────────────────────────────────────────

Deno.test("所有响应都包含 _context wrapper", async () => {
  const assert = await import("https://deno.land/std/assert/mod.ts");

  const endpoints = [
    get("/cards"),
    get("/constellations"),
    get("/dark-stars"),
    get("/graph"),
  ];

  const results = await Promise.all(endpoints);
  for (const { status, body } of results) {
    assert.assertEquals(status, 200);
    assert.assertExists(body._context, "_context 应存在于所有响应中");
    assert.assertExists(body._context.server_time);
    assert.assertExists(body._context.today_checklist);
    assert.assertExists(body._context.corridor);
  }
});

Deno.test("POST 成功响应也包含 _context", async () => {
  const { status, body } = await post("/cards", {
    created_by: "lori",
    title: "_context 测试卡",
  });

  const assert = await import("https://deno.land/std/assert/mod.ts");
  assert.assertEquals(status, 201);
  assert.assertExists(body._context);
  assert.assertExists(body._context.server_time);
});
