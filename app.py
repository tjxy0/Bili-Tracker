"""
Bilibili 视频评论数追踪器 — Flask 后端
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import requests as http_requests
import time

app = Flask(__name__)
CORS(app)

# Bilibili API 基础配置
BILIBILI_API_URL = "https://api.bilibili.com/x/web-interface/view"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.bilibili.com",
}


def normalize_bvid(bvid: str) -> str:
    """
    标准化 BV 号：
    - 去除首尾空白
    - 若不以 BV 开头，自动补上 BV
    """
    bvid = bvid.strip()
    if not bvid.upper().startswith("BV"):
        bvid = "BV" + bvid
    return bvid


def fetch_video_info(bvid: str) -> dict:
    """
    调用 Bilibili API 获取视频标题和评论数。
    返回 dict: { title, reply_count, bvid, url }
    """
    bvid = normalize_bvid(bvid)
    url = f"{BILIBILI_API_URL}?bvid={bvid}"

    try:
        resp = http_requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != 0:
            return {"error": data.get("message", "未知错误"), "code": data.get("code")}

        video = data["data"]
        pic = video.get("pic", "")
        if pic.startswith("//"):
            pic = "https:" + pic
        
        return {
            "title": video.get("title", "未知标题"),
            "reply_count": video.get("stat", {}).get("reply", 0),
            "view_count": video.get("stat", {}).get("view", 0),
            "like_count": video.get("stat", {}).get("like", 0),
            "coin_count": video.get("stat", {}).get("coin", 0),
            "favorite_count": video.get("stat", {}).get("favorite", 0),
            "share_count": video.get("stat", {}).get("share", 0),
            "danmaku_count": video.get("stat", {}).get("danmaku", 0),
            "bvid": bvid,
            "aid": video.get("aid", 0),
            "pic": pic,
            "owner": video.get("owner", {}).get("name", "未知"),
            "url": f"https://www.bilibili.com/video/{bvid}",
        }
    except http_requests.exceptions.Timeout:
        return {"error": "请求超时，请稍后重试"}
    except http_requests.exceptions.RequestException as e:
        return {"error": f"网络错误: {str(e)}"}
    except Exception as e:
        return {"error": f"未知错误: {str(e)}"}


# ──────────────────── 路由 ────────────────────

@app.route("/")
def index():
    """返回前端主页"""
    return render_template("index.html")


@app.route("/api/video_info")
def api_video_info():
    """获取视频完整信息"""
    bvid = request.args.get("bvid", "").strip()
    if not bvid:
        return jsonify({"error": "请输入 BV 号"}), 400

    result = fetch_video_info(bvid)
    if "error" in result:
        return jsonify(result), 400

    return jsonify(result)


@app.route("/api/video_stats")
def api_video_stats():
    """获取最新各项统计数据 (轮询用)"""
    bvid = request.args.get("bvid", "").strip()
    if not bvid:
        return jsonify({"error": "请输入 BV 号"}), 400

    bvid = normalize_bvid(bvid)
    url = f"{BILIBILI_API_URL}?bvid={bvid}"

    try:
        resp = http_requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != 0:
            return jsonify({"error": data.get("message", "未知错误")}), 400

        stat = data["data"].get("stat", {})
        return jsonify({
            "reply_count": stat.get("reply", 0),
            "like_count": stat.get("like", 0),
            "view_count": stat.get("view", 0),
            "timestamp": time.time(),
            "bvid": bvid,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────── 启动 ────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  Bilibili 评论数追踪器")
    print("  访问 http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, host="0.0.0.0", port=5000)
