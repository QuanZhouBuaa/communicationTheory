document.addEventListener('DOMContentLoaded', function() {
    // --- 元素获取 ---
    new PhosphorIcons.Icons(document.querySelectorAll("i[data-phosphor]"));
    const chatArea = document.querySelector('.chat-area');
    const userInput = document.querySelector('.chat-input-bar textarea');
    const sendBtn = document.querySelector('.send-btn');

    // --- 核心函数 ---

    function renderMathInElement(element) {
        if (!window.katex) {
            console.error("KaTeX library not loaded.");
            return;
        }
        element.innerHTML = element.innerHTML.replace(/\$\$(.*?)\$\$/g, (match, expression) => {
            try {
                return katex.renderToString(expression, { displayMode: true, throwOnError: false });
            } catch (e) { return match; }
        });
        element.innerHTML = element.innerHTML.replace(/\$(.*?)\$/g, (match, expression) => {
            if (match.startsWith('$$') && match.endsWith('$$')) return match;
            try {
                return katex.renderToString(expression, { displayMode: false, throwOnError: false });
            } catch (e) { return match; }
        });
    }

    async function sendMessageToGemini(prompt) {
        // --- 动态 API 地址配置 ---
        let apiUrl = 'http://localhost:3000/chat'; // 本地开发默认地址

        // 如果不是在本地环境，则使用部署后的线上地址
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // 部署完成后，您必须将下面的地址替换成您真实的【后端】URL
            apiUrl = 'https://your-backend-url.onrender.com/chat'; // <-- ### 部署后请务必修改这里 ###
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error("Could not fetch from backend:", error);
            return "抱歉，连接AI助手时发生错误。请检查服务器是否正在运行，或API地址是否正确配置。";
        }
    }

    function displayMessage(message, sender) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message', sender);
        const avatarContent = sender === 'user' ? '我' : 'AI';
        const content = `
            ${sender === 'bot' || sender === 'bot-loading' ? `<div class="avatar">${avatarContent}</div>` : ''}
            <div class="message-content"><p>${message}</p></div>
            ${sender === 'user' ? `<div class="avatar">${avatarContent}</div>` : ''}
        `;
        messageContainer.innerHTML = content;
        chatArea.appendChild(messageContainer);
        if (sender === 'bot') {
            const messageContentP = messageContainer.querySelector('.message-content p');
            renderMathInElement(messageContentP);
        }
        chatArea.scrollTop = chatArea.scrollHeight;
        return messageContainer;
    }

    async function handleSend() {
        const userPrompt = userInput.value.trim();
        if (!userPrompt) return;
        displayMessage(userPrompt, 'user');
        userInput.value = '';
        const loadingMessage = displayMessage("正在思考中...", 'bot-loading');
        const rawResponse = await sendMessageToGemini(userPrompt);
        loadingMessage.remove();
        const parts = rawResponse.split('|||SIM_JSON|||');
        const textResponse = parts[0].trim();
        displayMessage(textResponse, 'bot');
    }

    // --- 事件绑定 ---
    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // 初始加载时渲染静态内容的公式
    document.querySelectorAll('.message-content').forEach(el => renderMathInElement(el));
    
    // --- 仿真图表代码 (保持不变) ---
    const ctx = document.getElementById('timeDomainChart').getContext('2d');
    let chart;
    const carrierFreqSlider = document.getElementById('carrier-freq');
    const modFreqSlider = document.getElementById('mod-freq');
    const modIndexSlider = document.getElementById('mod-index');
    const carrierFreqValue = document.getElementById('carrier-freq-value');
    const modFreqValue = document.getElementById('mod-freq-value');
    const modIndexValue = document.getElementById('mod-index-value');

    function generateChartData() {
        const fc = parseInt(carrierFreqSlider.value);
        const fm = parseInt(modFreqSlider.value);
        const m = parseFloat(modIndexSlider.value);
        const labels = [], amData = [], modulatingData = [];
        const duration = 2, samples = 500;
        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * duration;
            labels.push(t.toFixed(2));
            const modulating = Math.cos(2 * Math.PI * fm * t);
            amData.push((1 + m * modulating) * Math.cos(2 * Math.PI * fc * t));
            modulatingData.push(modulating * m + 2.5);
        }
        return { labels, amData, modulatingData };
    }

    function createOrUpdateChart() {
        const { labels, amData, modulatingData } = generateChartData();
        if (chart) { chart.data.labels = labels; chart.data.datasets[0].data = amData; chart.data.datasets[1].data = modulatingData; chart.update(); } else {
            chart = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [ { label: 'AM Signal', data: amData, borderColor: 'rgba(0, 169, 255, 1)', borderWidth: 2, pointRadius: 0, tension: 0.1 }, { label: 'Modulating Signal (shifted)', data: modulatingData, borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A0A0' } }, x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A0A0', maxTicksLimit: 10 } } }, plugins: { legend: { labels: { color: '#E0E0E0' } } } } });
        }
    }
    
    [carrierFreqSlider, modFreqSlider, modIndexSlider].forEach(slider => {
        slider.addEventListener('input', () => {
            carrierFreqValue.textContent = `${carrierFreqSlider.value} Hz`;
            modFreqValue.textContent = `${modFreqSlider.value} Hz`;
            modIndexValue.textContent = modIndexSlider.value;
            createOrUpdateChart();
        });
    });

    window.activateSimulation = () => { createOrUpdateChart(); };
    activateSimulation();
});