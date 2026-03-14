import { useEffect } from "react";
import "./Toast.css";

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="toast toast-error">
      <span className="toast-icon">⚠️</span>
      <span className="toast-msg">{message}</span>
    </div>
  );
}
