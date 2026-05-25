import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Question {
  id: string;
  type?: "mc" | "blank";
  question: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswers?: string[];
  explanation: string;
}

const PORT = 3000;
const QUESTIONS_FILE = path.join(process.cwd(), "questions.json");

const defaultQuestions: Question[] = [
  {
    id: "cin-1",
    question: "大耳狗 (Cinnamoroll) 究竟是什麼可愛的動物？",
    options: ["長耳貓咪 (Cat)", "白色小狗 (Puppy)", "粉紅兔子 (Rabbit)", "蓬鬆棉花糖 (Cotton Candy)"],
    correctAnswerIndex: 1,
    explanation: "大耳狗 (Cinnamoroll) 是藍眼睛、耳朵長長、尾巴捲捲的白色小狗。他絕非一隻小貓咪或小兔子喔！"
  },
  {
    id: "cin-2",
    question: "大耳狗是在哪裡誕生的呢？",
    options: ["咖啡廳的烤箱中 (Bakery Oven)", "遙遠天空的白雲上 (Cloud in the sky)", "糖果工廠的原料籃 (Candy Factory)", "森林深處的橡樹洞 (Tree hollow)"],
    correctAnswerIndex: 1,
    explanation: "大耳狗是在遙遠天空的白雲上面誕生的，因為尾巴捲捲的像肉桂捲，所以被叫做 Cinnamoroll。"
  },
  {
    id: "cin-3",
    question: "大耳狗那一對大大的長耳朵，除了十分討喜之外還有什麼奇妙的功能？",
    options: ["當作保暖圍巾 (Scarf)", "拿來當作扇子散熱 (Fan)", "可以在空中飛翔 (Fly in the air)", "能聽懂世界上所有動物的語言 (Translate)"],
    correctAnswerIndex: 2,
    explanation: "大耳狗可以用他大大的長耳朵拍打，使自己在美麗的藍天中自由自在地飛翔！"
  },
  {
    id: "cin-4",
    question: "大耳狗的英文名字 Cinnamoroll 與哪種可口點心有關？",
    options: ["甜甜圈 (Donut)", "肉桂捲 (Cinnamon roll)", "草莓千層派 (Strawberry crepe)", "法式舒芙蕾 (Soufflé)"],
    correctAnswerIndex: 1,
    explanation: "他的名字來源於他那如同肉桂捲 (Cinnamon roll) 一樣捲捲的大尾巴，非常可愛又香甜！"
  },
  {
    id: "cin-5",
    question: "大耳狗在肉桂咖啡店（Cafe Cinnamon）中擔任什麼角色，最喜愛什麼香氣？",
    options: ["看門犬 / 精油香氣", "招牌吉祥物 / 剛出爐的肉桂捲香氣", "專業咖啡師 / 摩卡咖啡香", "清潔大師 / 肥皂泡泡香"],
    correctAnswerIndex: 1,
    explanation: "大耳狗是 Cafe Cinnamon 令人喜愛的招牌吉祥物，最喜歡嗅聞剛出爐的甜蜜肉桂捲香氣！"
  }
];

// Helper to load questions
function loadQuestions(): Question[] {
  try {
    if (fs.existsSync(QUESTIONS_FILE)) {
      const data = fs.readFileSync(QUESTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading questions.json file:", err);
  }
  // Safe default and write
  saveQuestions(defaultQuestions);
  return defaultQuestions;
}

// Helper to save questions
function saveQuestions(questions: Question[]) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing questions.json file:", err);
  }
}

async function startServer() {
  const app = express();
  
  // Parse incoming JSON body
  app.use(express.json());

  // 1. API Endpoint: Fetch all questions
  app.get("/api/questions", (req, res) => {
    const list = loadQuestions();
    res.json(list);
  });

  // 2. API Endpoint: Save / Overwrite whole list of questions
  app.post("/api/questions", (req, res) => {
    try {
      const data = req.body;
      const isQValid = (q: any) => {
        if (!q.id || typeof q.question !== "string" || !q.question.trim()) return false;
        if (typeof q.explanation !== "string") return false;
        const qType = q.type || "mc";
        if (qType === "blank") {
          return Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0;
        } else {
          return Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctAnswerIndex === "number";
        }
      };

      if (Array.isArray(data)) {
        const valid = data.every(isQValid);
        if (!valid) {
          return res.status(400).json({ error: "無效的題目格式。請檢查所有必填欄位。" });
        }
        saveQuestions(data);
        return res.json({ success: true, message: "題目已成功更新！", count: data.length });
      } else {
        // Assume trying to add a single question
        const { type, question, options, correctAnswerIndex, correctAnswers, explanation } = data;
        const qType = type || "mc";
        if (!question || typeof question !== "string") {
          return res.status(400).json({ error: "新增題目失敗：請填寫題目描述。" });
        }
        if (qType === "blank" && (!Array.isArray(correctAnswers) || correctAnswers.length === 0)) {
          return res.status(400).json({ error: "新增填空題失敗：必填至少一個正確填空答案！" });
        }
        if (qType === "mc" && (!Array.isArray(options) || options.length < 2 || typeof correctAnswerIndex !== "number")) {
          return res.status(400).json({ error: "新增選擇題失敗：必須至少有兩個選項，且提供正確答案索引。" });
        }

        const currentList = loadQuestions();
        const newQ: Question = {
          id: `custom-${Date.now()}`,
          type: qType,
          question,
          options: qType === "blank" ? [] : options,
          correctAnswerIndex: qType === "blank" ? 0 : correctAnswerIndex,
          correctAnswers: qType === "blank" ? correctAnswers : undefined,
          explanation: explanation || "答對了！🐾"
        };
        currentList.push(newQ);
        saveQuestions(currentList);
        return res.json({ success: true, message: "已成功新增一題！", question: newQ });
      }
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "儲存題目時發生異常錯誤" });
    }
  });

  // 3. API Endpoint: Update specific question
  app.put("/api/questions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { type, question, options, correctAnswerIndex, correctAnswers, explanation } = req.body;
      const qType = type || "mc";
      
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "修改失敗：請填寫題目描述。" });
      }
      if (qType === "blank" && (!Array.isArray(correctAnswers) || correctAnswers.length === 0)) {
        return res.status(400).json({ error: "修改填空題失敗：請填寫正確填空答案。" });
      }
      if (qType === "mc" && (!Array.isArray(options) || options.length < 2 || typeof correctAnswerIndex !== "number")) {
        return res.status(400).json({ error: "修改選擇題失敗：必須提供合格的選項與答案索引。" });
      }

      const questionsList = loadQuestions();
      const idx = questionsList.findIndex(q => q.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "找不到該題目的 ID。" });
      }
      
      questionsList[idx] = {
        id,
        type: qType,
        question,
        options: qType === "blank" ? [] : options,
        correctAnswerIndex: qType === "blank" ? 0 : correctAnswerIndex,
        correctAnswers: qType === "blank" ? correctAnswers : undefined,
        explanation: explanation || "答對了！🐾"
      };
      
      saveQuestions(questionsList);
      res.json({ success: true, message: "題目修改成功！", question: questionsList[idx] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "修改題目時伺服器發生異常" });
    }
  });

  // 4. API Endpoint: Delete specific question
  app.delete("/api/questions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const questionsList = loadQuestions();
      const initialLength = questionsList.length;
      const newList = questionsList.filter(q => q.id !== id);
      if (newList.length === initialLength) {
        return res.status(404).json({ error: "找不到該題目的 ID。" });
      }
      saveQuestions(newList);
      res.json({ success: true, message: "已刪除該題目。" });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "刪除題目時伺服器發生異常" });
    }
  });

  // API Endpoint: Batch Delete questions
  app.post("/api/questions/batch-delete", (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "請提供要刪除的題目 ID 列表。" });
      }
      const questionsList = loadQuestions();
      const newList = questionsList.filter(q => !ids.includes(q.id));
      saveQuestions(newList);
      res.json({ success: true, message: `已成功刪除 ${questionsList.length - newList.length} 題！` });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "批量刪除時伺服器發生異常" });
    }
  });

  // 5. API Endpoint: Reset to defaults
  app.post("/api/questions/reset", (req, res) => {
    try {
      saveQuestions(defaultQuestions);
      res.json({ success: true, message: "已重置題目為預設 Cinnamoroll 趣味問答！", questions: defaultQuestions });
    } catch (err: any) {
      res.status(500).json({ error: "重置題目失敗" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cinnamoroll Game Dev Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
