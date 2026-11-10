import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { eanError } from "@/utils/Barcode";

export type CameraStatus = "starting" | "scanning" | "unavailable";

// Reads barcodes from the back camera into a <video>. Calls onDetected once with the first
// plausible barcode (digits, a standard length) and stops the camera; anything else in frame (a QR
// code, a misread) is skipped so scanning goes on. Stops by itself when `active` ends or the screen
// unmounts. A missing camera, a refused permission or an insecure page (browsers only allow cameras
// on HTTPS or localhost) all end in "unavailable", so the caller can offer typing instead.
export function useBarcodeCamera(videoEl: HTMLVideoElement | null, active: boolean, onDetected: (barcode: string) => void) {
  const [status, setStatus] = useState<CameraStatus>("starting");
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!active || !videoEl) return;
    setStatus("starting");
    // React's `muted` attribute doesn't reliably set the DOM property, which autoplay needs
    videoEl.muted = true;

    let cancelled = false;
    let controls: IScannerControls | null = null;

    new BrowserMultiFormatReader()
      .decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoEl, (result, _error, scanner) => {
        controls = scanner;
        if (cancelled || !result) return;
        const text = result.getText();
        if (eanError(text)) return;
        scanner.stop();
        onDetectedRef.current(text);
      })
      .then((scanner) => {
        controls = scanner;
        if (cancelled) scanner.stop();
        else setStatus("scanning");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active, videoEl]);

  return status;
}
