import { useState } from "react";
import { Body1, Button, Input, Label } from "@fluentui/react-components";
import { AddRegular, SubtractRegular } from "@fluentui/react-icons";
import { useStyles } from "@/styles/QuantityStepper.styles";

type QuantityStepperProps = {
  id: string;
  label: string;
  /** null while the field is empty. */
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Quiet help under the field, e.g. "Available: 12". */
  hint?: string;
  /** Replaces the hint when the value isn't acceptable. */
  error?: string;
  /** "counter": for counting things as you touch them - a big add button and a small minus one. */
  variant?: "stepper" | "counter";
};

// A whole-number field for a thumb: big − and + buttons around a large numeric input (the numeric
// keyboard comes up on phones).
export function QuantityStepper({ id, label, value, onChange, min = 0, max, hint, error, variant = "stepper" }: QuantityStepperProps) {
  const styles = useStyles();
  const current = value ?? min;
  // What was typed, kept as typed: "1.5" or "-2" must not turn into 15 or 2. Anything but a whole
  // number counts as no quantity (so it can't be confirmed) and says so.
  const [typed, setTyped] = useState<string | null>(null);
  // The typed text stands while it is what the value came from; a value set from outside replaces it
  const showTyped = typed !== null && (value === null || Number(typed) === value);
  const invalid = showTyped && typed !== "" && !/^\d+$/.test(typed);
  const message = invalid ? "Enter a whole number" : error;
  const step = (next: number) => {
    setTyped(null);
    onChange(next);
  };

  const input = (
    <Input
      id={id}
      className={variant === "counter" ? styles.counterInput : styles.input}
      size="large"
      inputMode="numeric"
      pattern="[0-9]*"
      value={showTyped ? typed : value === null ? "" : String(value)}
      onChange={(_, data) => {
        setTyped(data.value);
        onChange(/^\d+$/.test(data.value) ? Number(data.value) : null);
      }}
    />
  );

  if (variant === "counter") {
    return (
      <div className={styles.root}>
        <Label htmlFor={id} size="large">
          {label}
        </Label>
        {input}
        <div className={styles.counterRow}>
          <Button
            className={styles.add}
            appearance="primary"
            size="large"
            aria-label="Increase"
            onClick={() => step(current + 1)}
          >
            +1
          </Button>
          <Button
            className={styles.minus}
            size="large"
            icon={<SubtractRegular />}
            aria-label="Decrease"
            disabled={current <= min}
            onClick={() => step(Math.max(min, current - 1))}
          />
        </div>
        {(message || hint) && <Body1 className={message ? styles.error : styles.hint}>{message ?? hint}</Body1>}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Label htmlFor={id} size="large">
        {label}
      </Label>
      <div className={styles.row}>
        <Button
          className={styles.step}
          size="large"
          icon={<SubtractRegular />}
          aria-label="Decrease"
          disabled={current <= min}
          onClick={() => step(Math.max(min, current - 1))}
        />
        {input}
        <Button
          className={styles.step}
          size="large"
          icon={<AddRegular />}
          aria-label="Increase"
          disabled={max !== undefined && current >= max}
          onClick={() => step(max === undefined ? current + 1 : Math.min(max, current + 1))}
        />
      </div>
      {(message || hint) && <Body1 className={message ? styles.error : styles.hint}>{message ?? hint}</Body1>}
    </div>
  );
}
