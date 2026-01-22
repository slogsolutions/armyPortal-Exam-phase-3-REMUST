import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, "..", "public", "mock_bulk_questions.csv");

const trades = [
  {
    name: "JE NE REMUST",
    papers: {
      "WP-I": { totalQuestions: 70, durationMinutes: 60, totalMarks: 70, sampleCount: 35 },
      "WP-II": { totalQuestions: 70, durationMinutes: 60, totalMarks: 70, sampleCount: 35 }
    }
  },
  {
    name: "DR CL-1",
    papers: {
      "WP-I": { totalQuestions: 50, durationMinutes: 25, totalMarks: 50, sampleCount: 35 },
      "WP-II": { totalQuestions: 50, durationMinutes: 25, totalMarks: 50, sampleCount: 35 }
    }
  },
  {
    name: "OCC CL-2",
    papers: {
      "WP-I": { totalQuestions: 100, durationMinutes: 25, totalMarks: 100, sampleCount: 40 },
      "WP-II": { totalQuestions: 100, durationMinutes: 25, totalMarks: 100, sampleCount: 40 }
    }
  }
];

const header = [
  "Trade",
  "PaperType",
  "PaperDurationMinutes",
  "PaperTotalQuestions",
  "PaperTotalMarks",
  "Question",
  "OptionA",
  "OptionB",
  "OptionC",
  "OptionD",
  "CorrectAnswer",
  "Marks"
];

const rows = [header.join(",")];
const answerCycle = ["A", "B", "C", "D"];

trades.forEach((trade) => {
  Object.entries(trade.papers).forEach(([paperType, config]) => {
    const perQuestionMark = config.totalMarks / config.totalQuestions;
    for (let i = 0; i < config.sampleCount; i += 1) {
      const answer = answerCycle[i % answerCycle.length];
      const paddedIndex = String(i + 1).padStart(3, "0");
      const questionText = `${trade.name} ${paperType} practice question ${paddedIndex}`;
      const baseOption = `${trade.name} ${paperType} topic ${Math.floor(i / 5) + 1}`;

      const options = {
        A: `${baseOption} - Concept overview`,
        B: `${baseOption} - Applied example`,
        C: `${baseOption} - Field scenario`,
        D: `${baseOption} - Troubleshooting step`
      };

      rows.push([
        trade.name,
        paperType,
        config.durationMinutes,
        config.totalQuestions,
        config.totalMarks,
        questionText,
        options.A,
        options.B,
        options.C,
        options.D,
        answer,
        perQuestionMark.toFixed(2)
      ].join(","));
    }
  });
});

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, rows.join("\n"), "utf8");
console.log(`✅ Generated ${rows.length - 1} questions at ${OUTPUT_PATH}`);
