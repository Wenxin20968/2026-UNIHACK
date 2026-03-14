import { useEffect, useState } from "react";
import "./RewardPopup.css";

export default function RewardPopup({ quest, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`popup-overlay ${visible ? "visible" : ""}`} onClick={handleClose}>
      <div
        className={`popup-card ${visible ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-burst">✨</div>
        <div className="popup-icon">{quest.icon}</div>
        <h2 className="popup-title">Quest Complete!</h2>
        <p className="popup-quest-name">{quest.title}</p>

        <div className="popup-rewards">
          <div className="reward-badge xp-badge">
            <span className="reward-icon">⚡</span>
            <span className="reward-value">+{quest.rewardXp} XP</span>
          </div>
          <div className="reward-badge piece-badge">
            <span className="reward-icon">🧩</span>
            <span className="reward-value">Puzzle Piece #{quest.puzzlePieceIndex + 1}</span>
          </div>
        </div>

        <div className="popup-piece-preview" style={{ background: quest.color }}>
          <span className="piece-emoji">{quest.icon}</span>
        </div>

        <p className="popup-hint">Tap anywhere to continue your quest!</p>
        <button className="popup-close-btn" onClick={handleClose}>
          🎉 Awesome!
        </button>
      </div>
    </div>
  );
}
