/**
 * CheckpointQuiz Concept - AI Augmented Version
 */

import { GeminiLLM } from "./gemini-llm";

export interface Quiz {
  content: string;
  question: string;
  answers: string[];
  correctAnswer: string;
}

export interface QuizAttempt {
  quiz: Quiz;
  selectedAnswer: string;
  isCorrect: boolean;
}

export class CheckpointQuiz {
  async createQuiz(
    content: string,
    llm: GeminiLLM,
    options?: { promptVariant?: "baseline" | "json" | "constrained" }
  ): Promise<Quiz> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Content must not be empty");
      }
      const variant = options?.promptVariant ?? "baseline";

      //old prompt: const prompt = `Generate a multiple-choice quiz question based on the following content:\n\n${content}\n\nProvide one question and four possible answers, indicating which one is correct. Format the response as follows:\nQuestion: <question>\nAnswers: <answer1>, <answer2>, <answer3>, <answer4>\nCorrect Answer: <correctAnswer>`;
      const prompt =
        variant === "json"
          ? `You are a precise quiz generator. Read the content and return STRICT JSON only, no prose, matching this schema exactly: {"question": string, "answers": string[4], "correctAnswer": string}. The correctAnswer must be one of answers and there must be exactly 4 answers.
CONTENT:\n${content}\n
Return only JSON.`
          : variant === "constrained"
          ? `Generate a single multiple-choice question from the content with EXACTLY FOUR options.
Rules:
- The four answers must be mutually exclusive, concise, and plausible.
- The correct answer MUST be copied verbatim into the answers list.
- Output in this exact template (no extra lines):
Question: <question>
Answers: <answer1>, <answer2>, <answer3>, <answer4>
Correct Answer: <one of the four>
CONTENT:\n${content}`
          : `Generate a multiple-choice quiz question based on the following content:\n\n${content}\n\nProvide one question and four possible answers, indicating which one is correct. Format the response as follows:\nQuestion: <question>\nAnswers: <answer1>, <answer2>, <answer3>, <answer4>\nCorrect Answer: <correctAnswer>`;

      const response = await llm.executeLLM(prompt);

      // Try JSON parsing first if it looks like JSON
      const trimmed = response.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        trimmed.includes('"answers"')
      ) {
        try {
          const json = JSON.parse(trimmed);
          if (
            typeof json.question === "string" &&
            Array.isArray(json.answers) &&
            json.answers.length === 4 &&
            typeof json.correctAnswer === "string" &&
            json.answers.includes(json.correctAnswer)
          ) {
            return {
              content,
              question: json.question,
              answers: json.answers,
              correctAnswer: json.correctAnswer,
            };
          }
        } catch (_) {
          // fall through to template parsing
        }
      }

      const lines = response.split("\n").map((line) => line.trim());

      const questionLine = lines.find((line) => line.startsWith("Question:"));
      const answersLine = lines.find((line) => line.startsWith("Answers:"));
      const correctAnswerLine = lines.find((line) =>
        line.startsWith("Correct Answer:")
      );

      if (!questionLine || !answersLine || !correctAnswerLine) {
        throw new Error("Invalid response format from LLM");
      }

      const question = questionLine.replace("Question:", "").trim();
      const answers = answersLine
        .replace("Answers:", "")
        .split(",")
        .map((ans) => ans.trim());
      const correctAnswer = correctAnswerLine
        .replace("Correct Answer:", "")
        .trim();

      if (answers.length !== 4) {
        throw new Error("There must be exactly four answers");
      }

      if (!answers.includes(correctAnswer)) {
        throw new Error("Correct answer must be one of the provided answers");
      }

      // Additional validators for logical issues from LLM outputs
      this.validateAnswersUniquenessAndNonEmpty(answers);
      this.validateNoTrickCatchAllOptions(answers);
      this.validateGrounding(content, question, correctAnswer);

      return {
        content,
        question,
        answers,
        correctAnswer,
      };
    } catch (error) {
      console.error("Error creating quiz:", error);
      throw new Error("Failed to create quiz: " + error);
    }
  }

  async submitQuizAnswer(
    // user: User we'll omit for this assignment since there's no frontend yet
    quiz: Quiz,
    answer: string
  ): Promise<QuizAttempt> {
    return {
      quiz,
      selectedAnswer: answer,
      isCorrect: answer === quiz.correctAnswer,
    };
  }

  /**
   * Helper functions
   */

  private normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  private validateAnswersUniquenessAndNonEmpty(answers: string[]): void {
    const seen = new Set<string>();
    for (const raw of answers) {
      const ans = this.normalize(raw);
      if (!ans || ans.length === 0) {
        throw new Error("Answers must not be empty");
      }
      if (ans.length > 200) {
        throw new Error("Answers must be concise (<= 200 characters)");
      }
      if (seen.has(ans)) {
        throw new Error("Duplicate answers are not allowed");
      }
      seen.add(ans);
    }
  }

  private validateNoTrickCatchAllOptions(answers: string[]): void {
    const banned = [
      "all of the above",
      "none of the above",
      "both a and b",
      "all of these",
      "all of the options",
    ];
    const normalizedAnswers = answers.map((a) => this.normalize(a));
    for (const ans of normalizedAnswers) {
      if (banned.includes(ans)) {
        throw new Error(
          "Trick/catch‑all options (e.g., 'All of the above') are not allowed"
        );
      }
    }
  }

  private validateGrounding(
    content: string,
    question: string,
    correctAnswer: string
  ): void {
    // Require some overlap between content and the question/correct answer
    const contentNorm = this.normalize(content);
    const questionNorm = this.normalize(question);
    const answerNorm = this.normalize(correctAnswer);

    // Extract simple keywords (letters only, >= 3 chars)
    const toKeywords = (t: string) =>
      (t.match(/[a-zA-Z]{3,}/g) || []).filter((w) => w.length >= 3);

    const contentKw = new Set(toKeywords(contentNorm));
    const questionKw = toKeywords(questionNorm);
    const answerKw = toKeywords(answerNorm);

    const overlaps = (kws: string[]) => kws.some((w) => contentKw.has(w));

    if (!overlaps(questionKw) && !overlaps(answerKw)) {
      throw new Error(
        "Quiz appears ungrounded: neither the question nor the correct answer references the provided content"
      );
    }
  }

  /**
   * Display the quiz in a readable format
   */
  displayQuiz(quiz: Quiz): void {
    console.log("\nQuiz:");
    console.log(`Question: ${quiz.question}`);
    console.log("Options:");
    quiz.answers.forEach((answer, index) => {
      console.log(`  ${String.fromCharCode(65 + index)}. ${answer}`);
    });
    console.log(`Correct Answer: ${quiz.correctAnswer}`);
  }

  /**
   * Display the quiz attempt in a readable format
   */
  displayQuizAttempt(attempt: QuizAttempt): void {
    console.log("\nQuiz Attempt:");
    console.log(`Question: ${attempt.quiz.question}`);
    console.log(`Selected Answer: ${attempt.selectedAnswer}`);
    console.log(`Is Correct: ${attempt.isCorrect}`);
  }
}
