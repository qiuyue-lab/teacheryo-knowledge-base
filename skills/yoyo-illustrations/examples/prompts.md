# 使用示例

## 只做配图规划

```
先不要生图。分析下面这篇文章哪里值得配图，输出 4-6 张 shot list。
每张写：段落后位置、主题、核心意思、结构类型、YoYo 在做什么、建议中文标注。

<粘贴文章>
```

## 直接生成正文配图

```
把下面这篇文章生成 4 张 YoYo 小人怪诞正文配图。
要求：16:9、白底手绘、膝盖长度黄裙子、红棕短发、少量红橙蓝中文批注。

<粘贴文章>
```

## 为单个概念生成一张图

```
为「教育产品的权力错位，不是在浪费用户的时间，是在浪费用户的进化」
生成一张 YoYo 小人正文配图。YoYo 必须承担核心动作，裙子到膝盖。
```

## 安装到 Cursor

```bash
git clone https://github.com/qiuyue-lab/teacheryo-knowledge-base.git
mkdir -p ~/.cursor/skills
cp -R teacheryo-knowledge-base/skills/yoyo-illustrations ~/.cursor/skills/
```

安装后在 Cursor 中引用 skill 目录，或让 Agent 读取 `skills/yoyo-illustrations/SKILL.md`。
