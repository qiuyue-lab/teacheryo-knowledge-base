---
name: yoyo-illustrations
description: >-
  生成 TeacherYo 风格的 YoYo 小人中文正文配图。用于用户要求为中文文章、公众号、博客、
  Notion 文档生成「YoYo」「小人」「正文配图」「文章插图」「shot list」等任务；
  默认使用 YoYo IP、纯白手绘、膝盖长度黄裙子、红棕短发、少量红橙蓝中文批注。
---

# YoYo 小人正文配图

## 核心定位

为中文文章设计和生成 16:9 横版正文配图。视觉风格继承 [Ian Xiaohei Illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) 的怪诞正文配图语言，但固定 IP 换成 **YoYo 小人**——TeacherYo 公众号的个人视觉角色。

目标不是商业插画或 PPT 信息图，而是把文章里的关键判断、流程、结构、状态或隐喻，变成一张清爽、怪诞、有记忆点的手绘解释图。

## 先读这些参考

按任务需要读取，不要一次塞满上下文：

- `references/style-dna.md`：风格 DNA、颜色、禁忌（基于 Ian skill 适配）
- `references/yoyo-ip.md`：YoYo 外形、表情、动作原则、禁止项
- `references/prompt-template.md`：单张生图提示词模板
- `references/composition-patterns.md`：结构类型与隐喻发明方法
- `references/qa-checklist.md`：生成后检查规则
- `assets/reference-photo.png`：真人参考图，仅用于风格化提炼
- `assets/examples/yoyo-character-calibration-v5.png`：定稿角色校准样例

## 工作流

### 1. 消化正文

先读用户给的正文、Markdown、链接或截图。提炼：

- 核心观点是什么
- 哪些段落承担认知转折
- 哪些内容适合用图解释
- 哪些地方只适合文字，不需要图

不要平均配图。优先选择认知锚点：核心判断、前后对比、流程断点、角色状态变化、概念隐喻。

### 2. 先出配图策略

如果用户只说「分析怎么配图」，先给 shot list。每张图写清楚：

- 放在哪个段落后
- 图的主题
- 核心意思
- 结构类型
- YoYo 在图里做什么
- 建议中文标注词

默认 4-8 张。短文 1-3 张；长文不超过 9 张。

### 3. 单张生成

如果用户明确要求「生成 / 输出 / 做图」，不要停下来等确认；用 `GenerateImage` 每张单独生成。

每张图只讲一个核心结构。提示词必须包含：

- 16:9 横版中文正文配图
- 纯白背景
- 黑色手绘线稿
- YoYo 小人承担核心动作
- 膝盖长度明黄色无袖连衣裙、红棕短发、自然轻快表情
- 少量红橙蓝中文手写批注
- 禁止 PPT、商业插画、写真贴图、幼稚可爱

生成时必须附带参考图：

```json
"reference_image_paths": [
  "<skill-root>/assets/reference-photo.png",
  "<skill-root>/assets/examples/yoyo-character-calibration-v5.png"
]
```

并在 description 中明确：`stylize into hand-drawn sketch, NOT photorealistic`

每次从当前文章重新发明隐喻，不要照抄旧案例构图。

### 4. 检查与迭代

生成后检查 `references/qa-checklist.md`。常见问题优先重生成：

- YoYo 只是装饰
- 裙子过长或过短（应到膝盖）
- 表情呆板 deadpan
- 画面太满、太像 PPT
- 中文错字严重

### 5. 保存交付

最终图保存到：

```text
assets/<article-slug>-illustrations/
```

按顺序命名：`01-topic-name.png`、`02-topic-name.png`

## 输出口径

生成前的策略输出要短而准。生成后交付包含：几张图、每张用途、保存路径、哪些最稳。

不要长篇解释风格理论；让图自己说话。
