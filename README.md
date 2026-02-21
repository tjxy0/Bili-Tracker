# BiliTracker — Bilibili 实时数据监控终端

BiliTracker 是一款极简、黑白线条风格的 Bilibili 视频数据实时监控工具。它能够同步追踪视频的评论数、点赞数和播放量，并基于局部增长率提供精准的达标时间预测。

## 核心特性

- **实时追踪**：同步追踪评论 (Reply)、点赞 (Like) 与播放 (View) 三大核心指标。
- **智能达标预测 (ETA)**：采用滑动平均算法，根据最近的数据波动实时预估到达目标数值的具体时间与日期。
- **设计风格**：融合 Neo-Brutalism (新野兽主义) 设计风格，纯黑白线条。
- **动态图表**：内置极简风格折线图，实时呈现评论增长曲线。
- **自适应布局**：采用 CSS Grid 仪表盘架构，适配各尺寸屏幕。

## 技术栈

- **后端**: [Python 3](https://www.python.org/) + [Flask](https://flask.palletsprojects.com/)
- **数据源**: Bilibili Web API (官方公开接口)
- **前端**: Vanilla JS, CSS3, [Chart.js](https://www.chartjs.org/), [Phosphor Icons](https://phosphoricons.com/)

## 快速开始

### 1. 克隆与安装依赖

首先确保已安装 Python 3，然后在项目根目录运行：

```bash
pip install -r requirements.txt
```

### 2. 运行应用

执行以下命令启动 Flask 开发服务器：

```bash
python app.py
```

### 3. 开始监控

1. 浏览器访问 `http://localhost:5000`。
2. 在搜索框输入视频 **BV 号**（如 `BV1fy4y1L7Rq`）可不带BV前缀。
3. 设置采样间隔与目标数值，点击 **“开始追踪”**。

## 项目结构

```
obsever/
├── app.py              # Flask 后端
├── templates/
│   └── index.html      # 仪表盘页面
├── static/
│   ├── style.css       # 黑白线条风格定义与动画
│   └── script.js       # 数据轮询、图表同步与 ETA 逻辑
└── requirements.txt    # 项目依赖清单
```

## 免责声明

本工具仅用于学习交流及个人数据分析使用。请遵循 Bilibili 社区规范，合理设置采样间隔，避免垃圾请求造成服务器负担。
