/**
 * CheckpointQuiz Test Cases
 *
 * Demonstrates quiz creation and answer evaluation
 */

import { CheckpointQuiz } from "./checkpointQuiz";
import { GeminiLLM, Config } from "./gemini-llm";

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
  try {
    const config = require("../config.json");
    return config;
  } catch (error) {
    console.error(
      "❌ Error loading config.json. Please ensure it exists with your API key."
    );
    console.error("Error details:", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Test Case 1: Create a quiz from sample content
 */

export async function testCreateQuiz(): Promise<void> {
  console.log("\n🧪 TEST CASE 1: Create Quiz");
  console.log("==================================");

  const checkpointQuiz = new CheckpointQuiz();
  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const sampleContent: string =
    "France, officially the French Republic,[i] is a country primarily located in Western Europe. Its overseas regions and territories include French Guiana in South America, Saint Pierre and Miquelon in the North Atlantic, the French West Indies, and many islands in Oceania and the Indian Ocean, giving it the largest discontiguous exclusive economic zone in the world. Metropolitan France shares borders with Belgium and Luxembourg to the north; Germany to the northeast; Switzerland to the east; Italy and Monaco to the southeast; Andorra and Spain to the south; and a maritime border with the United Kingdom to the northwest. Its metropolitan area extends from the Rhine to the Atlantic Ocean and from the Mediterranean Sea to the English Channel and the North Sea. Its 18 integral regions—five of which are overseas—span a combined area of 632,702 km2 (244,288 sq mi) and have an estimated total population of over 68.6 million as of January 2025. France is a semi-presidential republic. Its capital, largest city and main cultural and economic centre is Paris. Metropolitan France was settled during the Iron Age by Celtic tribes known as Gauls before Rome annexed the area in 51 BC, leading to a distinct Gallo-Roman culture. In the Early Middle Ages, the Franks formed the kingdom of Francia, which became the heartland of the Carolingian Empire. The Treaty of Verdun of 843 partitioned the empire, with West Francia evolving into the Kingdom of France. In the High Middle Ages, France was a powerful but decentralised feudal kingdom, but from the mid-14th to the mid-15th centuries, France was plunged into a dynastic conflict with England known as the Hundred Years' War. In the 16th century French culture flourished during the French Renaissance, and a French colonial empire emerged. Internally, France was dominated by the conflict with the House of Habsburg and the French Wars of Religion between Catholics and Huguenots. France was successful in the Thirty Years' War and further increased its influence during the reign of Louis XIV. The French Revolution of 1789 overthrew the Ancien Régime and produced the Declaration of the Rights of Man, which expresses the nation's ideals to this day. France reached its political and military zenith in the early 19th century under Napoleon Bonaparte, subjugating part of continental Europe and establishing the First French Empire. Its collapse initiated a period of relative decline in which France endured the Bourbon Restoration until the founding of the French Second Republic which was succeeded by the Second French Empire upon Napoleon III's takeover. His empire collapsed during the Franco-Prussian War in 1870. This led to the establishment of the French Third Republic, with a period of economic prosperity and cultural and scientific flourishing known as the Belle Époque. France was one of the major participants of World War I, from which it emerged victorious at great human and economic cost. It was among the Allies of World War II, but it surrendered and was occupied in 1940. Following its liberation in 1944, the short-lived Fourth Republic was established and later dissolved in the course of the defeat in the Algerian War. The current Fifth Republic was formed in 1958 by Charles de Gaulle. Algeria and most French colonies became independent in the 1960s, with the majority retaining close economic and military ties with France. France retains its centuries-long status as a global centre of art, science, and philosophy. It hosts the fourth-largest number of UNESCO World Heritage Sites and is the world's leading tourist destination, having received 100 million foreign visitors in 2023. A developed country, France has a high nominal per capita income globally, and its economy ranks among the largest in the world by both nominal GDP and PPP-adjusted GDP. It is a great power, being one of the five permanent members of the United Nations Security Council and an official nuclear-weapon state. The country is part of multiple international organisations and forums.";

  const quiz = await checkpointQuiz.createQuiz(sampleContent, llm);
  checkpointQuiz.displayQuiz(quiz);

  const attempt = await checkpointQuiz.submitQuizAnswer(quiz, quiz.answers[0]); // choose any answer and see the result
  checkpointQuiz.displayQuizAttempt(attempt);
}

/**
 * Fake LLM to simulate tricky responses
 */
class FakeLLM {
  private mode: "proseWithNoise" | "wrongAnswerCount" | "missingCorrectAnswer";
  constructor(
    mode: "proseWithNoise" | "wrongAnswerCount" | "missingCorrectAnswer"
  ) {
    this.mode = mode;
  }
  async executeLLM(prompt: string): Promise<string> {
    if (this.mode === "proseWithNoise") {
      if (
        prompt.includes("Return only JSON") ||
        prompt.includes("STRICT JSON")
      ) {
        return JSON.stringify({
          question: "What is the capital of France?",
          answers: ["Paris", "Lyon", "Marseille", "Nice"],
          correctAnswer: "Paris",
        });
      }
      // Baseline: add commentary that breaks parsing
      return `Here is your quiz based on the content provided.\n\nQuestion: What is the capital of France?\nAnswers: Paris, Lyon, Marseille, Nice\nCorrect Answer: Paris\n\nNote: Capitals can be tricky!`;
    }

    if (this.mode === "wrongAnswerCount") {
      if (
        prompt.includes("EXACTLY FOUR") ||
        prompt.includes("mutually exclusive")
      ) {
        return `Question: Which river flows through Paris?\nAnswers: Seine, Loire, Garonne, Rhône\nCorrect Answer: Seine`;
      }
      // Baseline: returns five answers
      return `Question: Which river flows through Paris?\nAnswers: Seine, Loire, Garonne, Rhône, Danube\nCorrect Answer: Seine`;
    }

    // missingCorrectAnswer
    if (
      prompt.includes("EXACTLY FOUR") ||
      prompt.includes("MUST be copied verbatim")
    ) {
      return `Question: France is a member of which council?\nAnswers: UN Security Council, NATO, EU, OECD\nCorrect Answer: UN Security Council`;
    }
    // Baseline: correct answer not present in options
    return `Question: France is a member of which council?\nAnswers: NATO, EU, OECD, G7\nCorrect Answer: UN Security Council`;
  }
}

/**
 * TEST CASE 2:
 * Robustness to noisy prose output
 * Fix via JSON prompt variant
 */
export async function testNoisyProseMitigation(): Promise<void> {
  console.log("\n🧪 TEST CASE 2: Noisy prose output → JSON mitigation");
  console.log("==================================");

  const checkpointQuiz = new CheckpointQuiz();
  const llm = new FakeLLM("proseWithNoise");
  const content = "Paris is the capital of France.";

  console.log(
    "Approach: Trigger a response with extra prose that breaks the strict line parser; then retry with a JSON-only prompt variant."
  );

  let failed = false;
  try {
    await checkpointQuiz.createQuiz(content, llm as unknown as GeminiLLM);
  } catch (e) {
    failed = true;
    console.log("Expected failure with baseline prompt:", (e as Error).message);
  }

  const quiz = await checkpointQuiz.createQuiz(
    content,
    llm as unknown as GeminiLLM,
    { promptVariant: "json" }
  );
  checkpointQuiz.displayQuiz(quiz);

  console.log(
    "What worked: Forcing STRICT JSON enabled robust parsing.\nWhat went wrong: Baseline template was brittle to trailing commentary.\nRemaining issues: JSON may still be malformed; consider streaming/validation with retry."
  );
}

/**
 * TEST CASE 3:
 * Wrong number of answers
 * Mitigation via constrained template
 */
export async function testWrongAnswerCountMitigation(): Promise<void> {
  console.log("\n🧪 TEST CASE 3: Wrong answer count → Constrained template");
  console.log("==================================");

  const checkpointQuiz = new CheckpointQuiz();
  const llm = new FakeLLM("wrongAnswerCount");
  const content = "The Seine river flows through Paris.";

  console.log(
    "Approach: Baseline prompt yields five options; then constrain with explicit EXACTLY FOUR requirement."
  );

  let failed = false;
  try {
    await checkpointQuiz.createQuiz(content, llm as unknown as GeminiLLM);
  } catch (e) {
    failed = true;
    console.log("Expected failure with baseline prompt:", (e as Error).message);
  }

  const quiz = await checkpointQuiz.createQuiz(
    content,
    llm as unknown as GeminiLLM,
    { promptVariant: "constrained" }
  );
  checkpointQuiz.displayQuiz(quiz);

  console.log(
    "What worked: Constrained template nudged the model to exactly four options.\nWhat went wrong: Baseline lacks count control and fails validation.\nRemaining issues: Model may still disobey; add automatic repair/follow-up prompt if count != 4."
  );
}

/**
 * TEST CASE 4:
 * Correct answer missing from options.
 * Fix via constrained template
 */
export async function testMissingCorrectAnswerMitigation(): Promise<void> {
  console.log(
    "\n🧪 TEST CASE 4: Missing correct answer → Constrained template"
  );
  console.log("==================================");

  const checkpointQuiz = new CheckpointQuiz();
  const llm = new FakeLLM("missingCorrectAnswer");
  const content =
    "France is one of the five permanent members of the UN Security Council.";

  console.log(
    "Approach: Baseline prompt yields a correct answer not present in answers; then enforce consistency via constrained template."
  );

  let failed = false;
  try {
    await checkpointQuiz.createQuiz(content, llm as unknown as GeminiLLM);
  } catch (e) {
    failed = true;
    console.log("Expected failure with baseline prompt:", (e as Error).message);
  }

  const quiz = await checkpointQuiz.createQuiz(
    content,
    llm as unknown as GeminiLLM,
    { promptVariant: "constrained" }
  );
  checkpointQuiz.displayQuiz(quiz);

  console.log(
    "What worked: Explicit rule that correctAnswer must be copied verbatim into answers.\nWhat went wrong: Baseline doesn't enforce this invariant.\nRemaining issues: Add programmatic repair: if mismatch, ask the model to regenerate with the same rules."
  );
}

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
  console.log("🧠 CheckpointQuiz Test Suite");
  console.log("===========================\n");

  try {
    await testCreateQuiz();
    await testNoisyProseMitigation();
    await testWrongAnswerCountMitigation();
    await testMissingCorrectAnswerMitigation();
    console.log("\n🎉 All test cases completed successfully!");
  } catch (error) {
    console.error("❌ Test error:", (error as Error).message);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main();
}
