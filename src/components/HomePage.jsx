import { LEVEL_TITLES } from "../data/quests";
import PuzzleGrid from "./PuzzleGrid";
import "./HomePage.css";

export default function HomePage({ quests, progress, level, xpProgress, onSelectQuest, onReset }) {
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const completedCount = progress.completedQuests.length;

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">CampusQuest</h1>
            <p className="app-tagline">🗺️ Explore. Scan. Collect.</p>
          </div>
          <button className="reset-btn" onClick={onReset} title="Reset progress">
            🔄
          </button>
        </div>

        {/* Player card */}
        <div className="player-card">
          <div className="player-avatar">🧭</div>
          <div className="player-info">
            <div className="player-level-row">
              <span className="level-badge">Lvl {level}</span>
              <span className="level-title">{levelTitle}</span>
            </div>
            <div className="xp-bar-container">
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
            <div className="xp-text">
              <span>⚡ {progress.xp} XP total</span>
              <span>{completedCount}/6 quests done</span>
            </div>
          </div>
        </div>
      </div>

      <div className="home-body">
        {/* Puzzle Grid */}
        <PuzzleGrid unlockedPieces={progress.unlockedPuzzlePieces} quests={quests} />

        {/* Quest List */}
        <div className="quest-section">
          <h3 className="section-title">📋 Active Quests</h3>
          <div className="quest-list">
            {quests.map((quest) => {
              const isCompleted = progress.completedQuests.includes(quest.id);
              return (
                <div
                  key={quest.id}
                  className={`quest-card ${isCompleted ? "completed" : ""}`}
                  onClick={() => !isCompleted && onSelectQuest(quest)}
                  style={{ "--quest-color": quest.color }}
                >
                  <div className="quest-icon-wrap" style={{ background: isCompleted ? "#e2e8f0" : quest.color + "22", borderColor: quest.color + "44" }}>
                    <span className="quest-icon">{quest.icon}</span>
                  </div>
                  <div className="quest-info">
                    <h4 className="quest-title">{quest.title}</h4>
                    <p className="quest-location">📍 {quest.location}</p>
                    <div className="quest-meta">
                      <span className="quest-xp">+{quest.rewardXp} XP</span>
                      <span className={`quest-difficulty diff-${quest.difficulty.toLowerCase()}`}>
                        {quest.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="quest-status">
                    {isCompleted ? (
                      <div className="status-done">✅</div>
                    ) : (
                      <div className="status-arrow">→</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
