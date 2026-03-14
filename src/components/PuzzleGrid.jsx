import { PUZZLE_COLORS } from "../data/quests";
import "./PuzzleGrid.css";

export default function PuzzleGrid({ unlockedPieces, quests }) {
  const allUnlocked = unlockedPieces.length === 6;

  return (
    <div className="puzzle-section">
      <div className="puzzle-header">
        <h3 className="puzzle-title">🧩 Campus Puzzle</h3>
        <span className="puzzle-count">{unlockedPieces.length}/6 pieces</span>
      </div>

      {allUnlocked && (
        <div className="puzzle-complete-banner">
          🎊 Campus Puzzle Completed! You're a Campus Legend! 🎊
        </div>
      )}

      <div className="puzzle-grid">
        {quests.map((quest) => {
          const isUnlocked = unlockedPieces.includes(quest.puzzlePieceIndex);
          return (
            <div
              key={quest.puzzlePieceIndex}
              className={`puzzle-tile ${isUnlocked ? "unlocked" : "locked"}`}
              style={isUnlocked ? { background: PUZZLE_COLORS[quest.puzzlePieceIndex] } : {}}
            >
              {isUnlocked ? (
                <div className="tile-content">
                  <span className="tile-icon">{quest.icon}</span>
                  <span className="tile-label">{quest.location.split(" ")[0]}</span>
                </div>
              ) : (
                <div className="tile-locked">
                  <span className="lock-icon">🔒</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
