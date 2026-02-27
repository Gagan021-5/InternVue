export default function AiInsightPanel({ aiAnalysis }) {
  if (!aiAnalysis) {
    return (
      <div className="section-shell text-muted p-3 text-xs">
        AI insights are currently unavailable for this role.
      </div>
    );
  }

  return (
    <div className="section-shell space-y-3 p-3">
      <p className="text-soft text-xs">{aiAnalysis.summary}</p>

      {Array.isArray(aiAnalysis.strengths) && aiAnalysis.strengths.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-emerald-400">Strengths</p>
          <ul className="text-soft space-y-1 text-xs">
            {aiAnalysis.strengths.map((item, index) => (
              <li key={`${item}-${index}`}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(aiAnalysis.redFlags) && aiAnalysis.redFlags.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-red-400">Risk Signals</p>
          <ul className="text-soft space-y-1 text-xs">
            {aiAnalysis.redFlags.map((item, index) => (
              <li key={`${item}-${index}`}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(aiAnalysis.interviewQuestions) && aiAnalysis.interviewQuestions.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-blue-400">Interview Questions</p>
          <ul className="text-soft space-y-1 text-xs">
            {aiAnalysis.interviewQuestions.slice(0, 3).map((item, index) => (
              <li key={`${item}-${index}`}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
