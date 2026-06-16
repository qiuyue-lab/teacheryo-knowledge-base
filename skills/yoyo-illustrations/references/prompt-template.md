# 生图提示词模板

每张图单独生成。根据正文内容替换变量，不要把多张图拼在一起。

```text
Generate one standalone 16:9 horizontal Chinese article illustration.

Visual DNA:
Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red/orange/blue handwritten Chinese annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic photo, no photorealistic portrait.

Recurring IP character required:
YoYo, a simplified hand-drawn female character inspired by the reference images. Shoulder-length reddish-brown hair with short bangs. Bright yellow sleeveless loose dress — extends to KNEE length only, NOT calf, NOT ankle, NOT floor-length. Light and not dragging. NO pants. Slim energetic body. Natural warm expression with a gentle smile, lively eyes, NOT blank deadpan face. Black thin hand-drawn outlines with flat yellow dress fill. YoYo must perform the core conceptual action, not decorate the scene. Serious, clean, slightly absurd, not cute, not photorealistic.

Reference image guidance:
Use reference images only for hairstyle, yellow knee-length dress, and energetic personality. Stylize into hand-drawn sketch — do NOT paste the photo.

Theme:
{正文配图主题}

Structure type:
{结构类型：Workflow / 系统局部 / 前后对比 / 角色状态 / 概念隐喻 / 方法分层 / 地图路线 / 小漫画分镜}

Core idea:
{这张图要表达的核心意思}

Composition:
{具体画面：YoYo 在哪里、正在做什么、主要物件是什么、信息如何流动}

Chinese handwritten labels:
{标注词1} / {标注词2} / {标注词3}

Color use:
Black for line art. Yellow for YoYo's dress. Orange for flow/arrows. Red for key points. Blue for secondary notes.

Constraints:
One image explains only one core structure. 40%-60% main subject. At least 35% blank white space. Max 5-8 short Chinese labels. No top-left title. Invent fresh metaphor for this article.
```

## Cursor GenerateImage 调用

```json
{
  "description": "<填入上方模板>",
  "reference_image_paths": [
    "skills/yoyo-illustrations/assets/reference-photo.png",
    "skills/yoyo-illustrations/assets/examples/yoyo-character-calibration-v5.png"
  ]
}
```

路径按实际 workspace 调整为绝对路径或相对于项目根目录的路径。
