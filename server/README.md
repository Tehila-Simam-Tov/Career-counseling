# Backend API

## Endpoints

### POST /api/generate-questions
Generates 4 American-style multiple-choice questions based on profile text.

Request body:
{
  "profileText": "I enjoy solving problems, learning new tools, and working with people."
}

Response:
{
  "questions": [
    {
      "id": "q1",
      "text": "Do you like solving complex problems?",
      "options": [
        "Never",
        "Only when bored..",
        "I'm the first to solve!",
        "I prefer someone else to handle it"
      ]
    }
  ]
}

### POST /api/recommend-professions
Returns ranked professions based on the profile and selected answers.

Request body:
{
  "profileText": "I enjoy solving problems, learning new tools, and working with people.",
  "answers": [
    { "questionId": "q1", "selectedOption": 3 },
    { "questionId": "q2", "selectedOption": 1 },
    { "questionId": "q3", "selectedOption": 2 },
    { "questionId": "q4", "selectedOption": 4 }
  ]
}

Response:
{
  "recommendations": [
    {
      "profession": "Software Engineer",
      "score": 92,
      "reason": "Strong fit for analytical and problem-solving work."
    }
  ]
}
