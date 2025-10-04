# QuizRead

## Augment the design of a concept

### Original Concept

```
concept CheckpointQuiz [User, Content]
purpose quiz the reader on recently read content to maintain attention
principle after reading 2 pages, a multiple-choice quiz tests comprehension and feedback

state
  a set of Quizzes with
    a content Content
    a question String
    a set of answers String
    a correctAnswer String

  a set of QuizAttempts with
    a user User
    a quiz Quiz
    a selectedAnswer String
    a isCorrect Boolean

actions
  createQuiz (content: Content) : (quiz: Quiz)
    effect creates a quiz with a question and multiple-choice answers

  submitQuizAnswer (user: User, quiz: Quiz, answer: String) : (attempt: QuizAttempt)
    effect records user’s answer and whether it was correct
```

### AI Augmented Version

```
concept CheckpointQuiz [User, Content]
purpose quiz the reader on recently read content to maintain attention
principle after reading 2 pages, a multiple-choice quiz tests comprehension and feedback

state
  a set of Quizzes with
    a content Content
    a question String
    a set of answers String
    a correctAnswer String

  a set of QuizAttempts with
    a user User
    a quiz Quiz
    a selectedAnswer String
    a isCorrect Boolean

actions
  createQuiz (content: Content) : (quiz: Quiz)
    requires content to not be empty
    effect sends the content to an LLM to generate a relevant question and four multiple-choice answers

  submitQuizAnswer (user: User, quiz: Quiz, answer: String) : (attempt: QuizAttempt)
    effect records user’s answer and whether it was correct
```

## Design the user interaction

![Reading Page](assets/reading.jpeg)
![Quiz Prompt Page](assets/quiz_prompt.jpeg)

### User Journey

A user is trying to read their book for a class assignment. Unfortunately, they get distracted when reading and often have to reread pages multiple times, wasting time and effort. They search for ways to maintain their focus while reading and discover the concept of active reading. They find our app, QuizRead, and log in. They see the option to upload a digital version of their book, so they do so. After reading every 2 pages, they click to go to the next page, but a quiz pops up about those pages. The user has to select one of the four answers, and after submitting, they receive feedback about their answer.
