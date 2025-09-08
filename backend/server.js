const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Render 会通过环境变量提供 PORT，本地开发时默认为 3000
const port = process.env.PORT;

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CORS 安全配置 ---
const allowedOrigins = [
    'https://communicationclass.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// API 路由
app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body.prompt;
        if (!userInput) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const systemPrompt = `
            你是一位顶级的通信原理教育助手。请严格遵循以下规则：
            1. 用清晰易懂的语言回答用户的问题。
            2. 在回答中如果包含任何数学公式，必须使用标准的LaTeX格式。
            3. 对于块级公式（单独成行的），请使用 \`$$\` 作为定界符，例如 \`$$C = B \\log_2(1 + S/N)$$\`。
            4. 对于行内公式（嵌入在文本中的），请使用 \`$\` 作为定界符，例如 \`$f_c$\`。
            5. 判断用户的问题核心是否涉及一个可以交互仿真的概念（如：AM, FM, FSK）。
            6. 如果可以仿真，请在回答文本结束后，另起一行，并严格按照 "|||SIM_JSON|||{"isSimulatable": true, ...}" 的格式附加一个JSON对象。
            7. 如果不能仿真，则附加 "|||SIM_JSON|||{"isSimulatable": false}"。

            用户问题: "${userInput}"
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: 'Failed to get response from Gemini' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});
