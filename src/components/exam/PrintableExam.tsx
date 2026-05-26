interface Question {
  id: string | number;
  question: string;
  type?: string;
  points?: number;
  choices?: string[];
  options?: string[];
}

interface Solution {
  question_id?: string | number;
  answer?: string;
  steps?: Array<{ step?: number; explanation: string; result?: string }>;
}

interface PrintableExamProps {
  institutionLabel: string;
  title: string;
  subject?: string | null;
  durationMinutes?: number;
  totalPoints?: number;
  instructions?: string | null;
  questions: Question[];
  solutions?: Solution[];
  includeSolutions?: boolean;
  showAnswerLines?: boolean;
}

/**
 * Hidden printable region rendered with @media print styles (see index.css `.printable-exam`).
 * Designed to look like an official paper exam ("épreuve") when sent to the browser print dialog
 * (which also offers "Save as PDF").
 */
export function PrintableExam({
  institutionLabel,
  title,
  subject,
  durationMinutes,
  totalPoints,
  instructions,
  questions,
  solutions = [],
  includeSolutions = false,
  showAnswerLines = true,
}: PrintableExamProps) {
  return (
    <div className="printable-exam" aria-hidden="true">
      <div className="print-header">
        <div className="print-institution">EXAVY — {institutionLabel}</div>
        <div className="print-title">{title}</div>
        <div className="print-meta">
          {subject && <span><strong>Matière :</strong> {subject}</span>}
          {durationMinutes != null && <span><strong>Durée :</strong> {durationMinutes} min</span>}
          {totalPoints != null && <span><strong>Barème :</strong> {totalPoints} pts</span>}
          <span><strong>Nom :</strong> ........................................</span>
          <span><strong>Date :</strong> ......./......./...........</span>
        </div>
      </div>

      {instructions && (
        <div className="print-instructions">
          <div className="print-instructions-label">Consignes</div>
          <div>{instructions}</div>
        </div>
      )}

      {questions.map((q, idx) => {
        const choices = q.choices || q.options;
        const isMCQ = (q.type === 'multiple_choice' || q.type === 'qcm') && choices?.length;
        const isTF = q.type === 'true_false';
        const isEssay = q.type === 'essay';
        return (
          <div key={idx} className="print-question">
            <div className="print-question-header">
              <span className="print-question-num">Question {idx + 1}</span>
              {q.points != null && (
                <span className="print-question-points">({q.points} {q.points > 1 ? 'pts' : 'pt'})</span>
              )}
            </div>
            <div className="print-question-text">{q.question}</div>

            {isMCQ ? (
              <ol className="print-choices">
                {choices!.map((c, i) => (
                  <li key={i}>
                    <span className="letter">{String.fromCharCode(65 + i)}</span>
                    {c}
                  </li>
                ))}
              </ol>
            ) : isTF ? (
              <ol className="print-choices">
                <li><span className="letter">A</span>Vrai</li>
                <li><span className="letter">B</span>Faux</li>
              </ol>
            ) : showAnswerLines ? (
              <div className={`print-answer-lines${isEssay ? ' tall' : ''}`} />
            ) : null}
          </div>
        );
      })}

      {includeSolutions && solutions.length > 0 && (
        <>
          <div className="print-section-title">Corrigé</div>
          {questions.map((q, idx) => {
            const sol = solutions.find(s => String(s.question_id) === String(q.id)) || solutions[idx];
            if (!sol) return null;
            return (
              <div key={idx} className="print-solution">
                <div><span className="print-solution-label">Question {idx + 1} :</span> {sol.answer}</div>
                {sol.steps && sol.steps.length > 0 && (
                  <ol style={{ marginTop: '2mm', paddingLeft: '5mm' }}>
                    {sol.steps.map((s, i) => (
                      <li key={i} style={{ marginBottom: '1mm' }}>
                        {s.explanation}
                        {s.result && <em> → {s.result}</em>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="print-footer">
        Document généré par EXAVY • Utilisez "Enregistrer en PDF" dans la boîte d'impression
      </div>
    </div>
  );
}
