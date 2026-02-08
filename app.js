// Mermaid 图表转换器 - 主逻辑

// 初始化 Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'sans-serif'
});

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const chartsContainer = document.getElementById('chartsContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// 存储提取的图表数据
let extractedCharts = [];

// 文件上传事件
uploadArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
});

// 拖拽事件
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
});

// 处理上传的文件
async function processFile(file) {
    if (!file.name.match(/\.(md|markdown|txt)$/i)) {
        alert('请上传 Markdown 文件 (.md, .markdown, .txt)');
        return;
    }

    const text = await file.text();
    extractedCharts = extractMermaidCharts(text);

    if (extractedCharts.length === 0) {
        chartsContainer.innerHTML = '<div class="no-charts">未在文件中检测到 Mermaid 图表</div>';
        previewSection.style.display = 'block';
        downloadAllBtn.style.display = 'none';
        return;
    }

    downloadAllBtn.style.display = 'inline-block';
    previewSection.style.display = 'block';
    await renderCharts();
}

// 从 Markdown 中提取 Mermaid 代码块
function extractMermaidCharts(markdown) {
    const charts = [];
    // 匹配 ```mermaid ... ``` 代码块
    const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
    let match;
    let index = 1;

    while ((match = regex.exec(markdown)) !== null) {
        const code = match[1].trim();
        const type = detectChartType(code);
        charts.push({
            id: `chart-${index}`,
            code: code,
            type: type,
            name: `图表 ${index}`
        });
        index++;
    }

    return charts;
}

// 检测图表类型
function detectChartType(code) {
    const firstLine = code.split('\n')[0].toLowerCase().trim();

    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
        return '流程图';
    } else if (firstLine.startsWith('sequencediagram')) {
        return '时序图';
    } else if (firstLine.startsWith('classDiagram')) {
        return '类图';
    } else if (firstLine.startsWith('statediagram')) {
        return '状态图';
    } else if (firstLine.startsWith('erdiagram')) {
        return 'ER图';
    } else if (firstLine.startsWith('gantt')) {
        return '甘特图';
    } else if (firstLine.startsWith('pie')) {
        return '饼图';
    } else if (firstLine.startsWith('journey')) {
        return '用户旅程图';
    } else if (firstLine.startsWith('gitgraph')) {
        return 'Git图';
    } else if (firstLine.startsWith('mindmap')) {
        return '思维导图';
    } else if (firstLine.startsWith('timeline')) {
        return '时间线';
    }
    return 'Mermaid图表';
}

// 渲染所有图表
async function renderCharts() {
    chartsContainer.innerHTML = '';

    for (const chart of extractedCharts) {
        const cardHtml = `
            <div class="chart-card" id="card-${chart.id}">
                <div class="chart-header">
                    <span class="chart-title">${chart.name}</span>
                    <span class="chart-type">${chart.type}</span>
                </div>
                <div class="chart-preview" id="preview-${chart.id}">
                    <div class="loading">
                        <div class="spinner"></div>
                        <span>渲染中...</span>
                    </div>
                </div>
                <div class="chart-actions">
                    <button class="btn btn-secondary btn-sm" onclick="downloadPNG('${chart.id}')">
                        下载 PNG
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${chart.id}')">
                        复制图片
                    </button>
                </div>
            </div>
        `;
        chartsContainer.insertAdjacentHTML('beforeend', cardHtml);
    }

    // 逐个渲染图表
    for (const chart of extractedCharts) {
        await renderSingleChart(chart);
    }
}

// 渲染单个图表
async function renderSingleChart(chart) {
    const previewEl = document.getElementById(`preview-${chart.id}`);

    try {
        const { svg } = await mermaid.render(`mermaid-${chart.id}`, chart.code);
        previewEl.innerHTML = svg;
        chart.svg = svg;
    } catch (error) {
        previewEl.innerHTML = `
            <div class="error-message">
                渲染失败: ${error.message}
                <pre style="margin-top: 10px; font-size: 12px; overflow: auto;">${chart.code}</pre>
            </div>
        `;
        console.error(`渲染图表 ${chart.id} 失败:`, error);
    }
}

// 下载单个 PNG - 使用 html2canvas 从 DOM 截图
async function downloadPNG(chartId) {
    const chart = extractedCharts.find(c => c.id === chartId);
    if (!chart || !chart.svg) {
        alert('图表尚未渲染完成');
        return;
    }

    try {
        const pngBlob = await captureChartAsPng(chartId);
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chart.name}-${chart.type}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('转换PNG失败:', error);
        alert('转换PNG失败: ' + error.message);
    }
}

// 使用 html2canvas 从 DOM 元素截图
async function captureChartAsPng(chartId) {
    const previewEl = document.getElementById(`preview-${chartId}`);
    if (!previewEl) {
        throw new Error('找不到图表元素');
    }

    const canvas = await html2canvas(previewEl, {
        scale: 3,  // 3倍分辨率，高清
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas toBlob failed'));
            }
        }, 'image/png');
    });
}

// SVG 转 PNG（高清，3倍分辨率）
function svgToPng(svgString, scale = 3) {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            // 检查解析错误
            const parseError = svgDoc.querySelector('parsererror');
            if (parseError) {
                reject(new Error('SVG 解析错误'));
                return;
            }

            // 获取SVG尺寸
            let width = parseFloat(svgElement.getAttribute('width')) || 800;
            let height = parseFloat(svgElement.getAttribute('height')) || 600;

            // 如果没有明确尺寸，尝试从viewBox获取
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+|,/);
                if (parts.length === 4) {
                    width = parseFloat(parts[2]) || width;
                    height = parseFloat(parts[3]) || height;
                }
            }

            // 确保SVG有明确的宽高属性和xmlns
            svgElement.setAttribute('width', width);
            svgElement.setAttribute('height', height);
            if (!svgElement.getAttribute('xmlns')) {
                svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            // 内联所有样式，确保字体正确渲染
            const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleElement.textContent = `
                * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif !important; }
            `;
            svgElement.insertBefore(styleElement, svgElement.firstChild);

            // 创建高清Canvas
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');

            // 白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);

            // 使用 base64 编码处理中文字符
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const base64 = btoa(unescape(encodeURIComponent(svgData)));
            const dataUrl = 'data:image/svg+xml;base64,' + base64;

            const img = new Image();

            img.onload = () => {
                try {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/png');
                } catch (e) {
                    // 如果出现 tainted canvas 错误，尝试备用方案
                    fallbackSvgToPng(svgString, scale).then(resolve).catch(reject);
                }
            };

            img.onerror = (e) => {
                // 尝试备用方案
                fallbackSvgToPng(svgString, scale).then(resolve).catch(reject);
            };

            img.src = dataUrl;
        } catch (e) {
            reject(e);
        }
    });
}

// 备用方案：使用 canvas 直接绘制
function fallbackSvgToPng(svgString, scale = 3) {
    return new Promise((resolve, reject) => {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            let width = parseFloat(svgElement.getAttribute('width')) || 800;
            let height = parseFloat(svgElement.getAttribute('height')) || 600;

            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+|,/);
                if (parts.length === 4) {
                    width = parseFloat(parts[2]) || width;
                    height = parseFloat(parts[3]) || height;
                }
            }

            svgElement.setAttribute('width', width);
            svgElement.setAttribute('height', height);

            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);

            // 使用 encodeURIComponent 处理特殊字符
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const encodedSvg = encodeURIComponent(svgData)
                .replace(/'/g, '%27')
                .replace(/"/g, '%22');
            const dataUrl = 'data:image/svg+xml,' + encodedSvg;

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('转换失败，请尝试下载其他图表'));
                    }
                }, 'image/png');
            };
            img.onerror = () => {
                reject(new Error('图表转换失败，可能包含不支持的元素'));
            };
            img.src = dataUrl;
        } catch (e) {
            reject(e);
        }
    });
}

// 复制图片到剪贴板
async function copyToClipboard(chartId) {
    const chart = extractedCharts.find(c => c.id === chartId);
    if (!chart || !chart.svg) {
        alert('图表尚未渲染完成');
        return;
    }

    // 检查浏览器是否支持剪贴板API
    if (!navigator.clipboard || !window.ClipboardItem) {
        alert('您的浏览器不支持复制图片功能，请使用下载按钮');
        return;
    }

    try {
        const pngBlob = await captureChartAsPng(chartId);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob })
        ]);
        alert('图片已复制到剪贴板');
    } catch (error) {
        console.error('复制失败:', error);
        // 如果是权限问题，给出更明确的提示
        if (error.name === 'NotAllowedError') {
            alert('浏览器拒绝了剪贴板访问权限，请在浏览器设置中允许此网站访问剪贴板');
        } else {
            alert('复制失败: ' + error.message + '\n请使用下载按钮代替');
        }
    }
}

// 下载全部 PNG（打包为 ZIP）
downloadAllBtn.addEventListener('click', async () => {
    const chartsWithSvg = extractedCharts.filter(c => c.svg);

    if (chartsWithSvg.length === 0) {
        alert('没有可下载的图表');
        return;
    }

    // 生成文件夹名称（包含时间戳）
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    const folderName = `mermaid_charts_${timestamp}`;

    // 创建 ZIP 文件
    const zip = new JSZip();
    const folder = zip.folder(folderName);

    try {
        downloadAllBtn.disabled = true;
        downloadAllBtn.textContent = '转换中...';

        // 转换所有 SVG 为 PNG 并添加到 ZIP
        for (let i = 0; i < chartsWithSvg.length; i++) {
            const chart = chartsWithSvg[i];
            downloadAllBtn.textContent = `转换中 (${i + 1}/${chartsWithSvg.length})...`;
            const pngBlob = await captureChartAsPng(chart.id);
            const fileName = `${i + 1}_${chart.type}.png`;
            folder.file(fileName, pngBlob);
        }

        downloadAllBtn.textContent = '打包中...';
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('打包失败:', error);
        alert('打包失败，请重试');
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = '下载全部 PNG';
    }
});
