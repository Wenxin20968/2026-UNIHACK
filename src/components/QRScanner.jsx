import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import "./QRScanner.css";

export default function QRScanner({ onScan, onError, onClose }) {
  const scannerRef = useRef(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const scannerId = "qr-reader";

    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => {});
        onScan(decodedText);
      },
      () => {} // ignore per-frame errors
    );

    scannerRef.current = scanner;
    setScannerReady(true);

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }
    onScan(code);
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h3 className="scanner-title">📷 Scan QR Code</h3>
          <button className="scanner-close" onClick={onClose}>✕</button>
        </div>

        <p className="scanner-hint">Point your camera at the QR code at the location</p>

        <div id="qr-reader" className="qr-reader-box" />

        <div className="scanner-divider">
          <span>or</span>
        </div>

        {!showManual ? (
          <button
            className="manual-toggle-btn"
            onClick={() => setShowManual(true)}
          >
            ⌨️ Enter code manually (demo)
          </button>
        ) : (
          <div className="manual-input-section">
            <p className="manual-hint">Enter the QR code value directly for demo purposes:</p>
            <div className="manual-codes">
              {["quest_baillieu","quest_artswest","quest_oldquad","quest_pavilion","quest_southlawn","quest_msd"].map(code => (
                <button
                  key={code}
                  className="code-chip"
                  onClick={() => setManualCode(code)}
                >
                  {code}
                </button>
              ))}
            </div>
            <div className="manual-input-row">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. quest_baillieu"
                className="manual-input"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <button className="manual-submit-btn" onClick={handleManualSubmit}>
                ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
