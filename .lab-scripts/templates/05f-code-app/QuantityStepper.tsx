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

  const input = (
    <Input
      id={id}
      className={variant === "counter" ? styles.counterInput : styles.input}
      size="large"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value === null ? "" : String(value)}
      // Digits only: anything else typed or pasted is dropped
      onChange={(_, data) => {
        const digits = data.value.replace(/\D/g, "");
        onChange(digits === "" ? null : Number(digits));
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
            onClick={() => onChange(current + 1)}
          >
            +1
          </Button>
          <Button
            className={styles.minus}
            size="large"
            icon={<SubtractRegular />}
            aria-label="Decrease"
            disabled={current <= min}
            onClick={() => onChange(Math.max(min, current - 1))}
          />
        </div>
        {(error || hint) && <Body1 className={error ? styles.error : styles.hint}>{error ?? hint}</Body1>}
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
          onClick={() => onChange(Math.max(min, current - 1))}
        />
        {input}
        <Button
          className={styles.step}
          size="large"
          icon={<AddRegular />}
          aria-label="Increase"
          disabled={max !== undefined && current >= max}
          onClick={() => onChange(max === undefined ? current + 1 : Math.min(max, current + 1))}
        />
      </div>
      {(error || hint) && <Body1 className={error ? styles.error : styles.hint}>{error ?? hint}</Body1>}
    </div>
  );
}
