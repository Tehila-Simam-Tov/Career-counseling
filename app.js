const data = {
  questions: [
    { id: 'q1', text: 'Do you like solving complex problems?' },
    { id: 'q2', text: 'Do you enjoy visual design and aesthetics?' },
    { id: 'q3', text: 'Do you prefer structured, rule-based work like blueprints or specs?' },
    { id: 'q4', text: 'Do you enjoy working with data and statistics?' }
  ],
  professions: ['Software Engineer', 'Graphic Designer', 'Architect', 'Data Scientist'],
  scores: {
    q1: { 'Software Engineer': 8, 'Graphic Designer': 4, Architect: 10, 'Data Scientist': 9 },
    q2: { 'Software Engineer': 2, 'Graphic Designer': 10, Architect: 3, 'Data Scientist': 1 },
    q3: { 'Software Engineer': 6, 'Graphic Designer': 1, Architect: 10, 'Data Scientist': 2 },
    q4: { 'Software Engineer': 7, 'Graphic Designer': 1, Architect: 2, 'Data Scientist': 10 }
  }
};

function computeScores(professions, scoreMap, answers) {
  const totals = {};
  professions.forEach((profession) => { totals[profession] = 0; });

  Object.keys(answers).forEach((qid) => {
    if (!answers[qid]) return;
    const perQuestion = scoreMap[qid] || {};
    professions.forEach((profession) => {
      totals[profession] += perQuestion[profession] || 0;
    });
  });

  return totals;
}

function Home({ onStart }) {
  return (
    <div className="card hero-card">
      <div className="header-row">
        <div className="title-block">
          <h1>Occupational Diagnosis</h1>
          <p>Find the best-fit career path with 4 quick questions, crafted for a sharp modern experience.</p>
          <div className="info-pill">4 questions · personalized insight · fast result</div>
        </div>
      </div>
      <div className="hero-grid">
        <div className="hero-feature">
          <strong>Fast</strong>
          <span>Complete all questions in less than a minute.</span>
        </div>
        <div className="hero-feature">
          <strong>Clear</strong>
          <span>Simple yes/no questions for better guidance.</span>
        </div>
        <div className="hero-feature">
          <strong>Smart</strong>
          <span>Scores are calculated instantly as you answer.</span>
        </div>
      </div>
      <button className="button button-primary button-large" onClick={onStart}>Start the assessment</button>
    </div>
  );
}

function QuestionItem({ question, answer, onAnswer }) {
  return (
    <div className="question-card">
      <h3>{question.text}</h3>
      <div className="answer-actions">
        <button
          className={`button ${answer === true ? 'answer-yes answer-active' : 'button-secondary'}`}
          onClick={() => onAnswer(question.id, true)}
        >
          Yes
        </button>
        <button
          className={`button ${answer === false ? 'answer-no answer-active' : 'button-secondary'}`}
          onClick={() => onAnswer(question.id, false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

function Questions({ questions, answers, onAnswer, onSubmit, onBack }) {
  const completedCount = questions.filter((q) => answers[q.id] === true || answers[q.id] === false).length;
  const progress = Math.round((completedCount / questions.length) * 100);

  return (
    <div className="card">
      <div className="header-row">
        <div>
          <h2>Career preference questions</h2>
          <p className="small-muted">Choose yes or no to every question so the system can recommend the best match.</p>
        </div>
        <div className="theme-switcher">Answered: {completedCount}/{questions.length}</div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="page-shell">
        {questions.map((question) => (
          <QuestionItem
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onAnswer={onAnswer}
          />
        ))}
      </div>
      <div className="actions-row">
        <button className="button button-secondary" onClick={onBack}>Back</button>
        <button className="button button-primary" onClick={onSubmit}>See Results</button>
      </div>
    </div>
  );
}

const professionExplanation = {
  'Software Engineer': 'You prefer logic-rich tasks, problem solving, and turning ideas into functional systems.',
  'Graphic Designer': 'You value visual creativity, aesthetics, and designing strong communication through graphics.',
  Architect: 'You enjoy structured planning, creative building solutions, and combining design with precision.',
  'Data Scientist': 'You like working with data, extracting insights, and solving problems with statistics and models.'
};

function Subjects({ professions, scores, answers, onRetake, onBack }) {
  const totals = computeScores(professions, scores, answers);
  const sortedProfessions = [...professions].sort((a, b) => totals[b] - totals[a]);
  const topProfession = sortedProfessions[0];
  const topScore = totals[topProfession] || 0;
  const explanation = professionExplanation[topProfession] || '';
  const answeredYes = Object.keys(answers).filter((qid) => answers[qid] === true);

  return (
    <div className="card">
      <div className="header-row">
        <div>
          <h2>Your career match</h2>
          <p className="small-muted">This result reflects your strongest interests from the completed questions.</p>
        </div>
        <div className="theme-switcher">Top match: {topProfession}</div>
      </div>
      <div className="result-summary highlight-summary">
        <h3>{topProfession}</h3>
        <p>{explanation}</p>
      </div>
      <div className="result-card">
        {sortedProfessions.map((profession) => {
          const value = totals[profession];
          const percent = topScore ? Math.round((value / topScore) * 100) : 0;
          return (
            <div key={profession} className="result-row">
              <div className="result-label">
                <span>{profession}</span>
                <span>{value}</span>
              </div>
              <div className="result-track">
                <div className="result-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="result-summary">
        <h3>How the score was built</h3>
        <p>You selected yes to {answeredYes.length} question{answeredYes.length === 1 ? '' : 's'}, and each selection added points to professions that match your interests.</p>
      </div>
      <div className="actions-row">
        <button className="button button-secondary" onClick={onBack}>Back</button>
        <button className="button button-primary" onClick={onRetake}>Retake</button>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = React.useState('home');
  const [answers, setAnswers] = React.useState({});

  const handleAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const reset = () => {
    setAnswers({});
    setPage('home');
  };

  return (
    <div className="page-shell">
      {page === 'home' && <Home onStart={() => setPage('questions')} />}
      {page === 'questions' && (
        <Questions
          questions={data.questions}
          answers={answers}
          onAnswer={handleAnswer}
          onSubmit={() => setPage('results')}
          onBack={() => setPage('home')}
        />
      )}
      {page === 'results' && (
        <Subjects
          professions={data.professions}
          scores={data.scores}
          answers={answers}
          onBack={() => setPage('questions')}
          onRetake={reset}
        />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
