import "./QuestDetail.css";

export default function QuestDetail({ quest, isCompleted, onBack, onStartScan }) {
  return (
    <div className="quest-detail">
      {/* Header */}
      <div className="detail-header" style={{ "--quest-color": quest.color }}>
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="detail-hero">
          <div className="hero-icon">{quest.icon}</div>
          <div className="hero-badge" style={{ background: quest.color }}>
            Quest #{quest.id}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="detail-body">
        <div className="detail-card">
          <h2 className="detail-title">{quest.title}</h2>
          <div className="detail-location">
            <span className="location-icon">📍</span>
            <span>{quest.location}</span>
          </div>

          <div className="detail-divider" />

          <p className="detail-description">{quest.description}</p>

          <div className="detail-divider" />

          {/* Rewards section */}
          <h3 className="rewards-heading">🎁 Quest Rewards</h3>
          <div className="rewards-grid">
            <div className="reward-item">
              <div className="reward-icon-wrap" style={{ background: "#fef3c7" }}>
                ⚡
              </div>
              <div>
                <div className="reward-value">+{quest.rewardXp} XP</div>
                <div className="reward-label">Experience Points</div>
              </div>
            </div>
            <div className="reward-item">
              <div className="reward-icon-wrap" style={{ background: "#ede9fe" }}>
                🧩
              </div>
              <div>
                <div className="reward-value">Piece #{quest.puzzlePieceIndex + 1}</div>
                <div className="reward-label">Puzzle Tile</div>
              </div>
            </div>
          </div>

          <div className="detail-divider" />

          {/* Instructions */}
          <div className="instructions">
            <h3 className="instructions-title">📋 How to Complete</h3>
            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <p>Make your way to <strong>{quest.location}</strong></p>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <p>Find the CampusQuest QR code posted at the location</p>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <p>Tap the button below and scan the QR code to claim your reward!</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        {isCompleted ? (
          <div className="completed-banner">
            ✅ Quest Completed! Well done, explorer!
          </div>
        ) : (
          <button
            className="scan-btn"
            onClick={onStartScan}
            style={{ "--quest-color": quest.color }}
          >
            <span className="scan-btn-icon">📷</span>
            <span>Scan to Unlock</span>
          </button>
        )}
      </div>
    </div>
  );
}
