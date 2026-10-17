import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../lib/socket';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPanel({ roomId, userId, userName, quiz, accentColor }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    },
  ]);

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctIndex: 0 },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (qIdx, text) => {
    setErrorMsg('');
    setQuestions(prev => {
      const next = [...prev];
      next[qIdx] = { ...next[qIdx], question: text };
      return next;
    });
  };

  const handleOptionChange = (qIdx, oIdx, text) => {
    setErrorMsg('');
    setQuestions(prev => {
      const next = [...prev];
      const opts = [...next[qIdx].options];
      opts[oIdx] = text;
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const handleSetCorrect = (qIdx, oIdx) => {
    setErrorMsg('');
    setQuestions(prev => {
      const next = [...prev];
      next[qIdx] = { ...next[qIdx], correctIndex: oIdx };
      return next;
    });
  };

  const handleAddOption = (qIdx) => {
    if (questions[qIdx].options.length >= 6) return;
    setQuestions(prev => {
      const next = [...prev];
      next[qIdx] = { ...next[qIdx], options: [...next[qIdx].options, ''] };
      return next;
    });
  };

  const handleRemoveOption = (qIdx, oIdx) => {
    if (questions[qIdx].options.length <= 2) return;
    setQuestions(prev => {
      const next = [...prev];
      const opts = next[qIdx].options.filter((_, i) => i !== oIdx);
      let newCorrect = next[qIdx].correctIndex;
      if (newCorrect === oIdx) newCorrect = 0;
      else if (newCorrect > oIdx) newCorrect -= 1;
      next[qIdx] = { ...next[qIdx], options: opts, correctIndex: newCorrect };
      return next;
    });
  };

  const handleLaunchQuiz = () => {
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('⚠️ Please enter a title for the quiz.');
      return;
    }

    // Validate each question
    const sanitizedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`⚠️ Question ${i + 1} is missing the question text.`);
        return;
      }

      // Filter non-empty options
      const filledOptions = [];
      let newCorrectIndex = -1;

      for (let o = 0; o < q.options.length; o++) {
        const optText = q.options[o].trim();
        if (optText) {
          if (o === q.correctIndex) {
            newCorrectIndex = filledOptions.length;
          }
          filledOptions.push(optText);
        }
      }

      if (filledOptions.length < 2) {
        setErrorMsg(`⚠️ Question ${i + 1} must have at least 2 non-empty options.`);
        return;
      }

      if (newCorrectIndex === -1) {
        newCorrectIndex = 0; // Default to first available option if selected was blank
      }

      sanitizedQuestions.push({
        question: q.question.trim(),
        options: filledOptions,
        correctIndex: newCorrectIndex,
      });
    }

    // Launch via Socket
    socket.emit('create-quiz', {
      title: title.trim(),
      questions: sanitizedQuestions,
      userId,
      userName,
    });

    setCreating(false);
    setTitle('');
    setErrorMsg('');
    setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
  };

  const handleAnswer = (questionIndex, selectedIndex) => {
    if (!quiz) return;
    socket.emit('quiz-answer', {
      quizId: quiz._id,
      questionIndex,
      selectedIndex,
      userId,
      userName,
    });
  };

  const handleNext = () => {
    if (!quiz) return;
    socket.emit('next-question', { quizId: quiz._id });
  };

  const handleEnd = () => {
    if (!quiz) return;
    socket.emit('end-quiz', { quizId: quiz._id });
  };

  // ─────────────────────────────────────────────────────────────
  // 1. ACTIVE QUIZ PLAY VIEW
  // ─────────────────────────────────────────────────────────────
  if (quiz && quiz.isActive) {
    const currentQ = quiz.questions[quiz.currentQuestionIndex];
    const myScore = quiz.scores?.find(s => s.userId === userId);
    const myAnswer = myScore?.answers?.find(a => a.questionIndex === quiz.currentQuestionIndex);
    const isCreator = quiz.creatorId === userId;
    const leaderboard = [...(quiz.scores || [])].sort((a, b) => b.score - a.score);
    const totalAnswered = (quiz.scores || []).filter(s =>
      s.answers?.some(a => a.questionIndex === quiz.currentQuestionIndex)
    ).length;

    return (
      <div className="flex flex-col gap-4">
        {/* Quiz Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase tracking-wider">
                Live Quiz
              </span>
              <span className="text-xs text-text-dim">
                Host: <strong className="text-text-main">{quiz.creatorName || 'Admin'}</strong>
              </span>
            </div>
            <h3 className="font-bold text-base text-white mt-1">{quiz.title}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white/5 border border-border">
              Q{quiz.currentQuestionIndex + 1} / {quiz.questions.length}
            </span>
          </div>
        </div>

        {/* Current Question */}
        {currentQ && (
          <div>
            <p className="text-sm font-semibold text-text-main mb-3 leading-relaxed">
              {currentQ.question}
            </p>

            {/* Multiple Choice Options (A, B, C, D) */}
            <div className="flex flex-col gap-2.5">
              {currentQ.options.map((optText, i) => {
                const letter = OPTION_LETTERS[i] || `${i + 1}`;
                const isSelected = myAnswer?.selectedIndex === i;
                const isCorrect = myAnswer && currentQ.correctIndex === i;
                const showResult = !!myAnswer;

                let btnStyles = 'border-border bg-white/3 hover:bg-white/8 text-text-main';
                if (showResult) {
                  if (isCorrect) {
                    btnStyles = 'border-ok bg-ok/20 text-ok font-semibold';
                  } else if (isSelected && !isCorrect) {
                    btnStyles = 'border-bad bg-bad/20 text-bad font-semibold';
                  } else {
                    btnStyles = 'border-border bg-white/2 opacity-60 text-text-muted';
                  }
                }

                return (
                  <motion.button
                    key={i}
                    whileHover={!myAnswer ? { scale: 1.01 } : {}}
                    whileTap={!myAnswer ? { scale: 0.99 } : {}}
                    onClick={() => !myAnswer && handleAnswer(quiz.currentQuestionIndex, i)}
                    disabled={!!myAnswer}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${btnStyles}`}
                  >
                    {/* Option Letter Badge A, B, C, D */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                        showResult && isCorrect
                          ? 'bg-ok text-black font-extrabold'
                          : showResult && isSelected
                          ? 'bg-bad text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {letter}
                    </div>

                    {/* Actual Option Text written by Admin */}
                    <span className="text-sm flex-1 leading-snug">
                      {optText}
                    </span>

                    {/* Answer Status Badge */}
                    {showResult && isCorrect && (
                      <span className="text-xs font-bold text-ok flex items-center gap-1">
                        ✓ Correct
                      </span>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <span className="text-xs font-bold text-bad flex items-center gap-1">
                        ✗ Wrong
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Answered progress */}
            <div className="flex items-center justify-between text-[0.72rem] text-text-dim mt-3">
              <span>{totalAnswered} player{totalAnswered !== 1 ? 's' : ''} submitted</span>
              {myAnswer && (
                <span className={myAnswer.correct ? 'text-ok font-bold' : 'text-text-muted'}>
                  {myAnswer.correct ? '🎉 You got it right! (+1 pt)' : 'Better luck on the next one!'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Admin Controls */}
        {isCreator && (
          <div className="flex gap-2 pt-2 border-t border-border">
            {quiz.currentQuestionIndex < quiz.questions.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none text-white shadow-md"
                style={{ background: accentColor }}
              >
                Next Question ➔
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleEnd}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none text-white bg-ok shadow-md"
              >
                Show Final Results 🏆
              </motion.button>
            )}
            <button
              onClick={handleEnd}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border border-bad/30 text-bad bg-transparent hover:bg-bad/10 transition-colors"
            >
              End Quiz ⏹️
            </button>
          </div>
        )}

        {/* Real-time Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-text-dim mb-2 flex items-center gap-1.5">
              <span>🏆</span> Live Leaderboard
            </h4>
            <div className="flex flex-col gap-1.5">
              {leaderboard.slice(0, 5).map((s, i) => (
                <div
                  key={s.userId}
                  className="flex items-center gap-2.5 text-xs bg-white/2 rounded-lg px-3 py-2 border border-border"
                >
                  <span className="font-bold text-sm w-5 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="flex-1 font-semibold truncate text-text-main">
                    {s.userName} {s.userId === userId && <span className="text-[0.65rem] text-accent font-bold">(You)</span>}
                  </span>
                  <span className="font-mono font-bold text-xs" style={{ color: accentColor }}>
                    {s.score} pt{s.score !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CREATE QUIZ FORM VIEW (Admin sets options A, B, C, D)
  // ─────────────────────────────────────────────────────────────
  if (creating) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
            <span>🎯</span> Create Room Quiz
          </h4>
          <span className="text-[0.7rem] text-text-dim">Admin Quiz Builder</span>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-2.5 rounded-lg bg-bad/20 border border-bad/40 text-bad text-xs font-medium"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Title */}
        <div>
          <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-text-muted mb-1">
            Quiz Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrorMsg('');
            }}
            placeholder="e.g. JavaScript Trivia, Team Brainstorm Quiz..."
            className="w-full bg-[rgba(10,14,23,0.7)] border border-border rounded-xl px-3.5 py-2 text-sm text-text-main outline-none focus:border-accent transition-colors placeholder:text-text-dim"
            autoFocus
          />
        </div>

        {/* Question List */}
        <div className="max-h-72 overflow-y-auto flex flex-col gap-4 pr-1">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white/3 rounded-xl p-3.5 border border-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-accent">
                  Question {qIdx + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="text-xs text-text-dim hover:text-bad cursor-pointer bg-transparent border-none"
                    title="Remove Question"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* Question Input */}
              <input
                type="text"
                value={q.question}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                placeholder={`Type Question ${qIdx + 1} here...`}
                className="w-full bg-[rgba(10,14,23,0.5)] border border-border rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:border-accent placeholder:text-text-dim"
              />

              {/* Options A, B, C, D */}
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-text-dim block mb-2">
                  Options & Mark Correct Answer:
                </span>
                <div className="flex flex-col gap-2">
                  {q.options.map((optText, oIdx) => {
                    const letter = OPTION_LETTERS[oIdx] || `${oIdx + 1}`;
                    const isCorrect = q.correctIndex === oIdx;

                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        {/* Letter Tag A, B, C, D */}
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isCorrect ? 'bg-ok text-black font-extrabold' : 'bg-white/10 text-text-muted'
                          }`}
                        >
                          {letter}
                        </div>

                        {/* Admin actual option input */}
                        <input
                          type="text"
                          value={optText}
                          onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                          placeholder={`Enter option ${letter} answer...`}
                          className="flex-1 bg-[rgba(10,14,23,0.6)] border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-main outline-none focus:border-accent placeholder:text-text-dim"
                        />

                        {/* Mark Correct Pill Button */}
                        <button
                          type="button"
                          onClick={() => handleSetCorrect(qIdx, oIdx)}
                          className={`text-[0.68rem] font-bold px-2 py-1 rounded-md cursor-pointer border transition-colors ${
                            isCorrect
                              ? 'bg-ok/20 border-ok text-ok'
                              : 'bg-white/3 border-border text-text-dim hover:text-text-main hover:bg-white/6'
                          }`}
                        >
                          {isCorrect ? '✓ Correct' : 'Set Correct'}
                        </button>

                        {/* Remove Option Button */}
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIdx, oIdx)}
                            className="text-xs text-text-dim hover:text-bad cursor-pointer bg-transparent border-none px-1"
                            title="Delete option"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="text-[0.7rem] text-accent hover:underline cursor-pointer bg-transparent border-none mt-2 font-medium"
                  >
                    + Add Option ({OPTION_LETTERS[q.options.length] || 'Next'})
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-border bg-white/5 text-text-muted hover:bg-white/10 transition-colors"
          >
            + Question
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleLaunchQuiz}
            className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border-none text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            }}
          >
            Launch Quiz 🚀
          </motion.button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setErrorMsg('');
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-border bg-transparent text-text-dim hover:text-text-main transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. IDLE / PROMPT VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="text-center py-6">
      <div className="text-3xl mb-2">🎯</div>
      <h4 className="font-bold text-sm text-white mb-1">Live Trivia & Quizzes</h4>
      <p className="text-text-dim text-xs mb-4 max-w-xs mx-auto">
        Create a multiple-choice quiz with custom options A, B, C, D and challenge everyone in the room!
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setCreating(true)}
        className="px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          boxShadow: `0 4px 14px ${accentColor}40`,
        }}
      >
        🎯 Create New Quiz
      </motion.button>
    </div>
  );
}
