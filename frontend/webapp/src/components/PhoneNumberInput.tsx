import React, { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  CountryDialCode,
} from "@/constants/countryCodes";

interface PhoneNumberInputProps {
  id: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  error?: string;
  readOnly?: boolean;
  onDialCodeChange?: (dialCode: string, country?: CountryDialCode) => void;
}

const sanitizeNumber = (value: string) => value.replace(/[^\d]/g, "");

// Enhanced function to find dial code from various formats
const findDialCode = (value: string): { dialCode: CountryDialCode | undefined; remainingNumber: string } => {
  if (!value) return { dialCode: undefined, remainingNumber: "" };
  
  // Remove all non-digit characters except + for matching
  // Also handle "00" international prefix (replace with +)
  let normalized = value.replace(/[\s\-\(\)]/g, "");
  if (normalized.startsWith("00")) {
    normalized = "+" + normalized.slice(2);
  }
  
  // Try to find matching dial code (longest first to avoid partial matches)
  const sortedDialCodes = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length);
  
  for (const country of sortedDialCodes) {
    // Remove + from dial code for comparison
    const dialCodeDigits = country.dial_code.replace(/[^\d]/g, "");
    const dialCodeWithPlus = country.dial_code;
    
    // Check various formats:
    // 1. Starts with full dial code including +
    // 2. Starts with dial code digits (without +)
    // 3. Normalized value starts with dial code digits
    if (normalized.startsWith(dialCodeWithPlus)) {
      const remaining = normalized.slice(dialCodeWithPlus.length);
      return { dialCode: country, remainingNumber: remaining };
    } else if (normalized.startsWith(dialCodeDigits)) {
      const remaining = normalized.slice(dialCodeDigits.length);
      return { dialCode: country, remainingNumber: remaining };
    }
  }
  
  return { dialCode: undefined, remainingNumber: normalized };
};

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  disabled,
  required,
  placeholder,
  error,
  readOnly,
  onDialCodeChange,
}) => {
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [localNumber, setLocalNumber] = useState("");

  const availableDialCodes = useMemo(() => {
    const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const egyptIndex = sorted.findIndex(
      (country) =>
        country.code === "EG" || country.name.toLowerCase() === "egypt"
    );
    if (egyptIndex > 0) {
      const [egyptCountry] = sorted.splice(egyptIndex, 1);
      sorted.unshift(egyptCountry);
    }
    return sorted;
  }, []);

  // Track if dial code was manually changed to prevent reset
  const [isDialCodeManuallyChanged, setIsDialCodeManuallyChanged] =
    useState(false);

  useEffect(() => {
    // If dial code was manually changed, don't auto-detect from value
    // This allows users to change country codes freely
    if (isDialCodeManuallyChanged) {
      // Still update local number if value changes, but keep the selected dial code
      if (value) {
        const { remainingNumber } = findDialCode(value);
        // If we found a dial code in the value, use the remaining number
        // Otherwise, use the full value (user might be typing local number)
        const sanitized = remainingNumber || sanitizeNumber(value);
        setLocalNumber(sanitized);
      } else {
        setLocalNumber("");
      }
      return;
    }

    if (!value) {
      setLocalNumber("");
      return;
    }

    // Try to detect dial code from the value
    const { dialCode: detectedDialCode, remainingNumber } = findDialCode(value);
    
    if (detectedDialCode) {
      // Found a dial code in the value
      // Normalize the remaining number (remove leading 0 for Egyptian numbers)
      let normalizedRemaining = remainingNumber;
      if (detectedDialCode.dial_code === "+20" && normalizedRemaining.startsWith("0") && normalizedRemaining.length === 11) {
        normalizedRemaining = normalizedRemaining.substring(1);
      }
      
      setDialCode(detectedDialCode.dial_code);
      setLocalNumber(normalizedRemaining);
      if (onDialCodeChange) {
        onDialCodeChange(detectedDialCode.dial_code, detectedDialCode);
      }
    } else {
      // No dial code found, use default and treat entire value as local number
      const sanitized = sanitizeNumber(value);
      setDialCode(DEFAULT_DIAL_CODE);
      setLocalNumber(sanitized);
      if (onDialCodeChange) {
        const defaultCountry = availableDialCodes.find(
          (c) => c.dial_code === DEFAULT_DIAL_CODE
        );
        onDialCodeChange(DEFAULT_DIAL_CODE, defaultCountry);
      }
    }
  }, [value, availableDialCodes, onDialCodeChange, isDialCodeManuallyChanged]);

  useEffect(() => {
    if (value) return;
    if (onDialCodeChange) {
      const defaultCountry = availableDialCodes.find(
        (c) => c.dial_code === DEFAULT_DIAL_CODE
      );
      onDialCodeChange(DEFAULT_DIAL_CODE, defaultCountry);
    }
  }, [availableDialCodes, onDialCodeChange, value]);

  const emitChange = (code: string, number: string) => {
    if (!number) {
      onChange("");
      return;
    }
    
    // Normalize the number: remove leading 0 if present (local prefix)
    // For Egyptian numbers: 01012900990 should become 1012900990 when combined with +20
    // This is because the leading 0 is a local prefix that shouldn't be in international format
    // Correct format: +2011012900990 (not +201012900990)
    let normalizedNumber = number;
    
    // Remove leading 0 for Egyptian numbers when country code is +20
    // This ensures we send the correct international format to the backend
    if (code === "+20" && normalizedNumber.startsWith("0") && normalizedNumber.length === 11) {
      // Remove leading 0 for Egyptian numbers: 01012900990 -> 1012900990
      normalizedNumber = normalizedNumber.substring(1);
    }
    
    const fullValue = `${code}${normalizedNumber}`;
    onChange(fullValue);
  };

  const handleDialCodeChange = (code: string) => {
    // Mark that dial code was manually changed
    setIsDialCodeManuallyChanged(true);
    setDialCode(code);
    emitChange(code, localNumber);
    if (onDialCodeChange) {
      const country = availableDialCodes.find((c) => c.dial_code === code);
      onDialCodeChange(code, country);
    }
  };

  // Reset manual change flag when value is cleared externally
  // This allows auto-detection to work again when the field is cleared
  useEffect(() => {
    if (!value || value.trim() === "") {
      setIsDialCodeManuallyChanged(false);
    }
  }, [value]);

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    
    // Check if input contains a country code (starts with +, 00, or has many digits)
    const sanitized = sanitizeNumber(inputValue);
    const mightContainDialCode = inputValue.startsWith("+") || inputValue.startsWith("00") || sanitized.length > 12;
    
    if (mightContainDialCode && !isDialCodeManuallyChanged) {
      // Try to detect dial code from the input
      const { dialCode: detectedDialCode, remainingNumber } = findDialCode(inputValue);
      
      if (detectedDialCode) {
        // Found a dial code, update both dial code and local number
        // Normalize the remaining number (remove leading 0 for Egyptian numbers)
        let normalizedRemaining = remainingNumber;
        if (detectedDialCode.dial_code === "+20" && normalizedRemaining.startsWith("0") && normalizedRemaining.length === 11) {
          normalizedRemaining = normalizedRemaining.substring(1);
        }
        
        setDialCode(detectedDialCode.dial_code);
        setIsDialCodeManuallyChanged(false); // Reset flag since we auto-detected
        setLocalNumber(normalizedRemaining);
        emitChange(detectedDialCode.dial_code, normalizedRemaining);
        if (onDialCodeChange) {
          onDialCodeChange(detectedDialCode.dial_code, detectedDialCode);
        }
        return;
      }
    }
    
    // No dial code detected or manual dial code selected, use current dial code
    // Allow formatted input (spaces, dashes) but sanitize for storage
    const sanitizedLocal = sanitizeNumber(inputValue);
    setLocalNumber(sanitizedLocal);
    emitChange(dialCode, sanitizedLocal);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Select
          value={dialCode}
          onValueChange={handleDialCodeChange}
          disabled={disabled || readOnly}
        >
          <SelectTrigger
            className="w-[180px] min-w-[180px]"
            id={`${id}-dial-code`}
          >
            <SelectValue
              aria-label="Country dial code"
              placeholder={dialCode}
            />
          </SelectTrigger>
          <SelectContent>
            {availableDialCodes.map((country) => (
              <SelectItem key={country.code} value={country.dial_code}>
                {country.name} ({country.dial_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          value={localNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder || "123456789"}
          required={required}
          className="flex-1 min-w-[150px]"
          // Allow pasting formatted numbers with country codes
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData('text');
            // If pasted text looks like it contains a country code, handle it
            if (pastedText.includes('+') || sanitizeNumber(pastedText).length > 12) {
              e.preventDefault();
              // Let handleNumberChange process it
              const fakeEvent = {
                target: { value: pastedText }
              } as React.ChangeEvent<HTMLInputElement>;
              handleNumberChange(fakeEvent);
            }
            // Otherwise, let default paste behavior happen
          }}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
