import React, { useRef } from "react";
import { Input } from "./input";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  language?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  language = "en",
}) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number
  ) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const newValue =
      value.substring(0, idx) + val[0] + value.substring(idx + 1);
    onChange(newValue);
    // Move to next input
    if (val && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        // Clear current
        const newValue =
          value.substring(0, idx) + "" + value.substring(idx + 1);
        onChange(newValue);
      } else if (idx > 0) {
        // Move to previous
        inputsRef.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, idx) => (
        <Input
          key={idx}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          className={`w-10 h-12 text-center text-xl font-bold border-2 border-primary focus:border-primary focus:ring-2 focus:ring-primary ${
            language === "ar" ? "text-right" : ""
          }`}
          value={value[idx] || ""}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          ref={(el) => (inputsRef.current[idx] = el)}
          disabled={disabled}
          autoFocus={autoFocus && idx === 0}
          dir={language === "ar" ? "rtl" : "ltr"}
        />
      ))}
    </div>
  );
};
