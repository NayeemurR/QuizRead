/**
 * CheckpointQuiz Concept - AI Augmented Version
 */

import { GeminiLLM } from "./gemini-llm";

// here is the concept. We'll implement this in code below.
// concept CheckpointQuiz [User, Content]
// purpose quiz the reader on recently read content to maintain attention
// principle after reading 2 pages, a multiple-choice quiz tests comprehension and feedback

// state
//   a set of Quizzes with
//     a content Content
//     a question String
//     a set of answers String
//     a correctAnswer String

//   a set of QuizAttempts with
//     a user User
//     a quiz Quiz
//     a selectedAnswer String
//     a isCorrect Boolean

// actions
//   createQuiz (content: Content) : (quiz: Quiz)
//     requires content to not be empty
//     effect sends the content to an LLM to generate a relevant question and four multiple-choice answers

//   submitQuizAnswer (user: User, quiz: Quiz, answer: String) : (attempt: QuizAttempt)
//     effect records user’s answer and whether it was correct

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
  async createQuiz(content: string): Promise<Quiz> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Content must not be empty");
      }

      const llm = new GeminiLLM();
      const prompt = `Generate a multiple-choice quiz question based on the following content:\n\n${content}\n\nProvide one question and four possible answers, indicating which one is correct. Format the response as follows:\nQuestion: <question>\nAnswers: <answer1>, <answer2>, <answer3>, <answer4>\nCorrect Answer: <correctAnswer>`;

      const response = await llm.executeLLM(prompt);
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
}
