"""
AI+教育 八人串烧夜 海报生成脚本
- 竖版 1080x1920，适配微信社群/朋友圈分发
- 横版 1920x1080，适配直播/投屏贴片
- 纯 PIL 绘制，一键复跑
用法：
    python3 build_poster.py            # 两张都生成
    python3 build_poster.py vertical   # 只出竖版
    python3 build_poster.py horizontal # 只出横版
产出：output/poster_串烧夜_竖版.png, output/poster_串烧夜_横版.png
"""
from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)

W, H = 1080, 1920

INK = (22, 24, 28)
PAPER = (245, 241, 232)
ACCENT = (198, 79, 45)
MUTED = (120, 110, 95)
LINE = (30, 32, 36)

FONT_BOLD = "/System/Library/Fonts/Supplemental/Songti.ttc"
FONT_REG = "/System/Library/Fonts/Supplemental/Songti.ttc"

TITLE_L1 = "AI + 教育"
TITLE_L2 = "八人串烧夜"
TAG_TOP = "TeacherYo社群分享"
KICKER = "8 位一线实践者 · 每人 15 分钟"
DATE_LINE = "2026.04.19  周日  20:00 — 22:00"
INTRO_TEXT = "这不是散点式的经验罗列，而是一条完整的 AI 教育认知链：\n从宏观范式定调，深入课堂实践与资产沉淀；切入教与考的真实场景，\n再到产品设计落地；最后以教育的终极追问收尾。"
TAGLINE = "最接地气最前沿的一线 AI+教育实践"
BRAND = "TeacherYo"

SPEAKERS = [
    ("01", "20:00", "TeacherYo",  "从教师黑客松大赛到 AI 时代的教育范式变化"),
    ("02", "20:15", "星白之路",   "AI 如何融入课堂教学：我的实践与观察"),
    ("03", "20:30", "Bella",      "用 Wiki 知识库：让你的角色从【能用】到【好用】"),
    ("04", "20:45", "Amber",      "AI分身如何助力我沉淀教学资产：每节课留下痕迹"),
    ("05", "21:00", "焱鑫",       "如何用AI命一道神似高考题的题目"),
    ("06", "21:15", "孙闲云",     "基于 deeptutor 的自学：如何沉淀与调用学情"),
    ("07", "21:30", "希希",       "小项目型 AI 教育产品的底层设计思路与快速落地"),
    ("08", "21:45", "傻青",       "AI 的终极目的：让人更好地认识自己"),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def text_w(draw: ImageDraw.ImageDraw, s: str, f: ImageFont.FreeTypeFont) -> int:
    b = draw.textbbox((0, 0), s, font=f)
    return b[2] - b[0]


def draw_grain(img: Image.Image, opacity: int = 6) -> None:
    """Add a very subtle noise overlay for paper texture."""
    import random
    noise = Image.new("RGBA", img.size, (0, 0, 0, 0))
    npx = noise.load()
    for _ in range(img.size[0] * img.size[1] // 40):
        x = random.randint(0, img.size[0] - 1)
        y = random.randint(0, img.size[1] - 1)
        npx[x, y] = (0, 0, 0, opacity)
    img.alpha_composite(noise)


def build_vertical() -> Path:
    img = Image.new("RGBA", (W, H), PAPER + (255,))
    d = ImageDraw.Draw(img)

    margin = 72
    top = 80

    f_tag = font(FONT_REG, 24)
    tag = TAG_TOP
    tag_w = text_w(d, tag, f_tag)
    d.rectangle([margin, top, margin + tag_w + 32, top + 42],
                fill=INK)
    d.text((margin + 16, top + 6), tag, font=f_tag, fill=PAPER)

    title_y = top + 110
    f_title = font(FONT_BOLD, 168)
    d.text((margin, title_y), TITLE_L1, font=f_title, fill=INK)

    l2_y = title_y + 190
    d.text((margin, l2_y), TITLE_L2, font=f_title, fill=INK)

    l2_w = text_w(d, TITLE_L2, f_title)
    bar_x = margin + l2_w + 24
    bar_y = l2_y + 60
    d.rectangle([bar_x, bar_y, bar_x + 110, bar_y + 24], fill=ACCENT)

    f_kick = font(FONT_BOLD, 38)
    kick_y = l2_y + 190
    d.text((margin, kick_y), KICKER, font=f_kick, fill=INK)

    f_date = font(FONT_REG, 32)
    date_y = kick_y + 60
    d.text((margin, date_y), DATE_LINE, font=f_date, fill=MUTED)

    f_intro = font(FONT_REG, 24)
    intro_y = date_y + 64
    lines_intro = INTRO_TEXT.split("\n")
    for i, ln in enumerate(lines_intro):
        d.text((margin, intro_y + i * 38), ln, font=f_intro, fill=(100, 90, 80))

    sep_y = intro_y + len(lines_intro) * 38 + 30
    d.line([margin, sep_y, W - margin, sep_y], fill=LINE, width=2)

    list_top = sep_y + 30
    row_h = 98
    f_num = font(FONT_BOLD, 44)
    f_time = font(FONT_REG, 22)
    f_name = font(FONT_BOLD, 34)
    f_topic = font(FONT_REG, 26)

    for i, (num, tm, name, topic) in enumerate(SPEAKERS):
        y = list_top + i * row_h
        d.text((margin, y + 4), num, font=f_num, fill=ACCENT)

        tx = margin + 110
        d.text((tx, y - 4), tm, font=f_time, fill=MUTED)
        d.text((tx, y + 22), name, font=f_name, fill=INK)

        topic_x = margin + 320
        topic_max_w = W - margin - topic_x
        t = topic
        f_t = f_topic
        while text_w(d, t, f_t) > topic_max_w and len(t) > 6:
            t = t[:-2]
            if t != topic:
                t_with_ellipsis = t + "…"
                if text_w(d, t_with_ellipsis, f_t) <= topic_max_w:
                    t = t_with_ellipsis
                    break
        d.text((topic_x, y + 22), t, font=f_t, fill=INK)

        if i < len(SPEAKERS) - 1:
            d.line([margin, y + row_h - 16, W - margin, y + row_h - 16],
                   fill=(210, 200, 185), width=1)

    footer_top = list_top + len(SPEAKERS) * row_h + 40
    d.line([margin, footer_top, W - margin, footer_top], fill=LINE, width=2)

    f_tag_big = font(FONT_BOLD, 40)
    lines = TAGLINE.split("\n")
    for i, ln in enumerate(lines):
        d.text((margin, footer_top + 60 + i * 58), ln,
               font=f_tag_big, fill=INK)

    # Draw QR code at bottom right
    qr_path = ROOT / "qr.png"
    if qr_path.exists():
        qr_size = 130
        qr_x = W - margin - qr_size
        qr_y = footer_top + 40
        qr_img = Image.open(qr_path).convert("RGBA")
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        img.paste(qr_img, (qr_x, qr_y), qr_img)

        f_qr = font(FONT_REG, 16)
        qr_text = "如果您想加入我们一起讨论\n可以扫码添加微信，备注来意"
        # draw text below QR, right aligned
        lines_qr = qr_text.split("\n")
        for i, ln in enumerate(lines_qr):
            lw = text_w(d, ln, f_qr)
            d.text((W - margin - lw, qr_y + qr_size + 16 + i * 24), ln, font=f_qr, fill=MUTED)

    draw_grain(img, opacity=5)

    out_path = OUT / "poster_串烧夜_竖版.png"
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def build_horizontal() -> Path:
    """横版 1920x1080，左侧标题区，右侧讲者列表"""
    HW, HH = 1920, 1080
    img = Image.new("RGBA", (HW, HH), PAPER + (255,))
    d = ImageDraw.Draw(img)

    margin = 72

    f_tag = font(FONT_REG, 32)
    tag = TAG_TOP
    tag_w = text_w(d, tag, f_tag)
    d.rectangle([margin, margin, margin + tag_w + 40, margin + 50], fill=INK)
    d.text((margin + 20, margin + 8), tag, font=f_tag, fill=PAPER)

    left_col_w = 820

    f_title = font(FONT_BOLD, 150)
    title_y = margin + 90
    d.text((margin, title_y), TITLE_L1, font=f_title, fill=INK)
    d.text((margin, title_y + 170), TITLE_L2, font=f_title, fill=INK)

    l2_w = text_w(d, TITLE_L2, f_title)
    d.rectangle([margin + l2_w + 24, title_y + 170 + 60,
                 margin + l2_w + 24 + 100, title_y + 170 + 82], fill=ACCENT)

    f_kick = font(FONT_BOLD, 34)
    kick_y = title_y + 370
    d.text((margin, kick_y), KICKER, font=f_kick, fill=INK)

    f_date = font(FONT_REG, 28)
    d.text((margin, kick_y + 56), DATE_LINE, font=f_date, fill=MUTED)

    footer_top = HH - 220
    d.line([margin, footer_top, margin + left_col_w - 40, footer_top],
           fill=LINE, width=2)

    f_tagline = font(FONT_BOLD, 32)
    lines = TAGLINE.split("\n")
    for i, ln in enumerate(lines):
        d.text((margin, footer_top + 28 + i * 46), ln,
               font=f_tagline, fill=INK)

    f_brand = font(FONT_BOLD, 36)
    d.text((margin, HH - 80), BRAND, font=f_brand, fill=INK)

    divider_x = margin + left_col_w
    d.line([divider_x, margin, divider_x, HH - margin], fill=LINE, width=2)

    right_x = divider_x + 60
    right_w = HW - right_x - margin

    f_listhead = font(FONT_BOLD, 28)
    d.text((right_x, margin + 4), "今 晚 的 8 个 人", font=f_listhead, fill=INK)
    no_text = "NO. 01"
    f_no = font(FONT_REG, 22)
    nw = text_w(d, no_text, f_no)
    d.text((HW - margin - nw, margin + 8), no_text, font=f_no, fill=MUTED)

    list_top = margin + 70
    row_h = 108

    f_num = font(FONT_BOLD, 40)
    f_time = font(FONT_REG, 20)
    f_name = font(FONT_BOLD, 30)
    f_topic = font(FONT_REG, 22)

    for i, (num, tm, name, topic) in enumerate(SPEAKERS):
        y = list_top + i * row_h
        d.text((right_x, y + 4), num, font=f_num, fill=ACCENT)

        nx = right_x + 90
        d.text((nx, y - 2), tm, font=f_time, fill=MUTED)
        d.text((nx, y + 20), name, font=f_name, fill=INK)

        topic_x = right_x + 280
        topic_max_w = HW - margin - topic_x
        t = topic
        while text_w(d, t, f_topic) > topic_max_w and len(t) > 6:
            t = t[:-2]
            if text_w(d, t + "…", f_topic) <= topic_max_w:
                t = t + "…"
                break
        d.text((topic_x, y + 22), t, font=f_topic, fill=INK)

        if i < len(SPEAKERS) - 1:
            d.line([right_x, y + row_h - 12, HW - margin, y + row_h - 12],
                   fill=(210, 200, 185), width=1)

    draw_grain(img, opacity=5)

    out_path = OUT / "poster_串烧夜_横版.png"
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    results = []
    if mode in ("vertical", "all"):
        results.append(("竖版 1080x1920", build_vertical()))
    if mode in ("horizontal", "all"):
        results.append(("横版 1920x1080", build_horizontal()))
    for label, path in results:
        print(f"✅ {label}: {path}")


if __name__ == "__main__":
    main()
