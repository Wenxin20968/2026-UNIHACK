import { useState, useEffect } from "react";

const STORAGE_KEY = "campusquest_progress";

const defaultProgress = {
  xp: 0,
  completedQuests: [],
  unlockedPuzzlePieces: [],
};

export function useProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultProgress;
    } catch {
      return defaultProgress;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const completeQuest = (quest) => {
    setProgress((prev) => {
      if (prev.completedQuests.includes(quest.id)) return prev;
      return {
        xp: prev.xp + quest.rewardXp,
        completedQuests: [...prev.completedQuests, quest.id],
        unlockedPuzzlePieces: [...prev.unlockedPuzzlePieces, quest.puzzlePieceIndex],
      };
    });
  };

  const resetProgress = () => {
    setProgress(defaultProgress);
  };

  const level = Math.floor(progress.xp / 100) + 1;
  const xpToNextLevel = level * 100 - progress.xp;
  const xpProgress = ((progress.xp % 100) / 100) * 100;

  return { progress, completeQuest, resetProgress, level, xpToNextLevel, xpProgress };
}
