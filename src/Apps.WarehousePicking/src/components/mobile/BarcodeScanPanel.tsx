import { useState } from "react";
import { Body1, Button, Input, Spinner } from "@fluentui/react-components";
import { useBarcodeCamera } from "@/hooks/UseBarcodeCamera";
import { eanError } from "@/utils/Barcode";
import { useStyles } from "@/styles/BarcodeScanPanel.styles";

type BarcodeScanPanelProps = {
  /** Gets the barcode that was scanned or typed. */
  onDetected: (barcode: string) => void;
};

// Point the camera at a barcode, or type it when the camera can't (a worn label, a phone without
// camera access, a page the browser won't give a camera). Either way the result is the same call.
export function BarcodeScanPanel({ onDetected }: BarcodeScanPanelProps) {
  const styles = useStyles();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [typed, setTyped] = useState("");
  const status = useBarcodeCamera(videoEl, true, onDetected);
  const typedError = eanError(typed);

  return (
    <div className={styles.root} data-testid="scan-panel">
      {/* A callback ref: the camera must not start before the <video> is mounted */}
      <video ref={setVideoEl} className={status === "unavailable" ? styles.videoHidden : styles.video} muted autoPlay playsInline />
      {status === "starting" && <Spinner size="tiny" label="Starting the camera" />}
      {status === "scanning" && <Body1 className={styles.hint}>Point the camera at the barcode</Body1>}
      {status === "unavailable" && (
        <Body1 className={styles.hint}>The camera isn't available here. Type the barcode instead.</Body1>
      )}

      <div className={styles.row}>
        <Input
          className={styles.input}
          size="large"
          inputMode="numeric"
          placeholder="Or type the barcode"
          aria-label="Barcode"
          data-testid="scan-barcode-input"
          value={typed}
          onChange={(_, data) => setTyped(data.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && typed && !typedError) onDetected(typed);
          }}
        />
        <Button
          className={styles.lookup}
          appearance="primary"
          size="large"
          disabled={!typed || !!typedError}
          data-testid="scan-barcode-go"
          onClick={() => onDetected(typed)}
        >
          Find
        </Button>
      </div>
      {typed && typedError && <Body1 className={styles.hint}>{typedError}</Body1>}
    </div>
  );
}
