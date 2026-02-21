/**
 * Bilibili 综合监控终端 — 前端逻辑
 */

let trackingInterval = null;
let currentBvid = null;
let historyData = [];
let chart = null;
let startCount = 0;
let lastAnimateCounts = {
    reply: 0,
    like: 0,
    view: 0
};

// DOM Elements
const bvInput = document.getElementById('bv-input');
const searchBtn = document.getElementById('search-btn');
const videoPreviewArea = document.getElementById('video-preview-area');
const welcomeView = document.getElementById('welcome-view');
const statsDashboard = document.getElementById('stats-dashboard');
const trackBtn = document.getElementById('track-btn');
const stopBtn = document.getElementById('stop-btn');
const toastEl = document.getElementById('toast');

// Note: Dynamic background removed for monochrome theme


// Helper: Animate Number Change
function animateValue(obj, start, end, duration = 800) {
    if (isNaN(start) || isNaN(end)) {
        obj.innerHTML = end.toLocaleString();
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        obj.innerHTML = val.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Initialize Chart
function initChart() {
    const ctx = document.getElementById('growthChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '评论增长',
                data: [],
                borderColor: '#000000',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderWidth: 3,
                fill: true,
                tension: 0,
                pointRadius: 3,
                pointBackgroundColor: '#000000'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeInOutQuart' },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#000000', font: { size: 10 } } },
                y: { grid: { color: 'rgba(0, 0, 0, 0.1)', drawBorder: true }, ticks: { color: '#000000' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

// Search Logic
async function searchVideo() {
    let bvid = bvInput.value.trim();
    if (!bvid) return showToast('请输入有效的 BV 号');

    if (!bvid.toUpperCase().startsWith('BV')) {
        bvid = 'BV' + bvid;
        bvInput.value = bvid;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = '验证中...';

    try {
        const resp = await fetch(`/api/video_info?bvid=${bvid}`);
        const data = await resp.json();

        if (data.error) throw new Error(data.error);

        // Update UI
        document.getElementById('video-title').textContent = data.title;
        document.getElementById('video-owner').textContent = `UP: ${data.owner}`;
        document.getElementById('video-pic').src = data.pic;

        lastAnimateCounts = {
            reply: data.reply_count,
            like: data.like_count,
            view: data.view_count
        };

        document.getElementById('current-reply-count').textContent = data.reply_count.toLocaleString();
        document.getElementById('current-like-count').textContent = data.like_count.toLocaleString();
        document.getElementById('current-view-count').textContent = data.view_count.toLocaleString();

        currentBvid = bvid;

        // UI State
        welcomeView.classList.add('hidden');
        document.getElementById('video-preview-area').classList.remove('hidden');
        document.getElementById('config-area').classList.remove('hidden');
        statsDashboard.classList.remove('hidden');

        // Add animations
        document.getElementById('video-preview-area').classList.add('fade-in-up');
        document.getElementById('config-area').classList.add('fade-in-up');
        statsDashboard.classList.add('fade-in-up');

        stopTracking();
        historyData = [];
        if (chart) chart.destroy();
        initChart();

        showToast('视频元数据获取成功');
    } catch (e) {
        showToast('获取失败: ' + e.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = '查询视频';
    }
}

// Tracking Logic
function trackCount() {
    const interval = parseInt(document.getElementById('interval-input').value) || 5;
    if (interval < 1) return showToast('采样间隔至少为 1 秒');

    showToast('监控服务已启动');
    trackBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    updateStats();
    trackingInterval = setInterval(updateStats, interval * 1000);
}

function stopTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        showToast('监控已停止运行');
    }
    trackBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

async function updateStats() {
    try {
        const resp = await fetch(`/api/video_stats?bvid=${currentBvid}`);
        const data = await resp.json();

        if (data.error) return console.error(data.error);

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        // Animate Counters
        const metrics = ['reply', 'like', 'view'];
        metrics.forEach(m => {
            const el = document.getElementById(`current-${m}-count`);
            const newVal = data[`${m}_count`];
            if (newVal !== lastAnimateCounts[m]) {
                animateValue(el, lastAnimateCounts[m], newVal);
                lastAnimateCounts[m] = newVal;
            }
        });

        // Update History & Chart
        historyData.push({
            time: timeStr,
            reply: data.reply_count,
            like: data.like_count,
            view: data.view_count,
            timestamp: Date.now()
        });
        if (historyData.length > 40) historyData.shift();

        chart.data.labels = historyData.map(d => d.time);
        chart.data.datasets[0].data = historyData.map(d => d.reply);
        chart.update('none');

        calculatePredictiveStats(data);
    } catch (e) {
        console.error('Stats Update Error:', e);
    }
}

function calculatePredictiveStats(latestData) {
    // Use a smaller window for more sensitive rate (e.g., last 5 entries)
    const windowSize = 5;
    const recentHistory = historyData.slice(-windowSize);
    if (recentHistory.length < 2) return;

    const first = recentHistory[0];
    const last = recentHistory[recentHistory.length - 1];
    const timeSpanMin = (last.timestamp - first.timestamp) / 60000;

    if (timeSpanMin > 0) {
        const metrics = ['reply', 'like', 'view'];
        metrics.forEach(m => {
            const countSpan = last[m] - first[m];
            const rate = (countSpan / timeSpanMin).toFixed(2);
            const rateEl = document.getElementById(m === 'reply' ? 'growth-rate' : `${m}-growth-rate`);
            if (rateEl) rateEl.textContent = (rate > 0 ? '+' : '') + rate;
        });

        const currentReplyRate = (last.reply - first.reply) / timeSpanMin;

        const target = parseInt(document.getElementById('target-input').value);
        const lastCount = latestData.reply_count;

        if (target && target > lastCount && currentReplyRate > 0) {
            const remaining = target - lastCount;
            const minsToTarget = remaining / currentReplyRate;

            // Format ETA
            let d = Math.floor(minsToTarget / 1440);
            let h = Math.floor((minsToTarget % 1440) / 60);
            let m = Math.floor(minsToTarget % 60);

            let etaTxt = "";
            if (d > 0) etaTxt += `${d}天 `;
            if (h > 0 || d > 0) etaTxt += `${h}时 `;
            etaTxt += `${m}分`;
            document.getElementById('target-eta').textContent = etaTxt;

            // Target Date
            const finishDate = new Date(Date.now() + (minsToTarget * 60000));
            const dateFmt = `${finishDate.getMonth() + 1}/${finishDate.getDate()} ${finishDate.getHours()}:${finishDate.getMinutes().toString().padStart(2, '0')}`;
            document.getElementById('target-date').textContent = `约 ${dateFmt}`;
        } else {
            document.getElementById('target-eta').textContent = '--';
            document.getElementById('target-date').textContent = '--';
        }
    }
}

// Events
searchBtn.addEventListener('click', searchVideo);
bvInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchVideo());
trackBtn.addEventListener('click', trackCount);
stopBtn.addEventListener('click', stopTracking);

// Init
window.onload = () => {
    initChart();
};
