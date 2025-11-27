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

const findDialCode = (value: string): CountryDialCode | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, "");
  return COUNTRY_DIAL_CODES.find((country) =>
    normalized.startsWith(country.dial_code)
  );
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
      (country) => country.code === "EG" || country.name.toLowerCase() === "egypt"
    );
    if (egyptIndex > 0) {
      const [egyptCountry] = sorted.splice(egyptIndex, 1);
      sorted.unshift(egyptCountry);
    }
    return sorted;
  }, []);

  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }

    const detectedDialCode = findDialCode(value);
    if (detectedDialCode) {
      setDialCode(detectedDialCode.dial_code);
      setLocalNumber(value.replace(detectedDialCode.dial_code, "").trim());
      if (onDialCodeChange) {
        onDialCodeChange(detectedDialCode.dial_code, detectedDialCode);
      }
    } else {
      const normalized = value.startsWith("+") ? value.slice(1) : value;
      setDialCode(DEFAULT_DIAL_CODE);
      setLocalNumber(normalized);
      if (onDialCodeChange) {
        const defaultCountry = availableDialCodes.find(
          (c) => c.dial_code === DEFAULT_DIAL_CODE
        );
        onDialCodeChange(DEFAULT_DIAL_CODE, defaultCountry);
      }
    }
  }, [value, availableDialCodes, onDialCodeChange]);

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
    const fullValue = number ? `${code}${number}` : "";
    onChange(fullValue);
  };

  const handleDialCodeChange = (code: string) => {
    setDialCode(code);
    emitChange(code, localNumber);
    if (onDialCodeChange) {
      const country = availableDialCodes.find((c) => c.dial_code === code);
      onDialCodeChange(code, country);
    }
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumber(event.target.value);
    setLocalNumber(sanitized);
    emitChange(dialCode, sanitized);
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
          <SelectTrigger className="w-[160px]" id={`${id}-dial-code`}>
            <SelectValue aria-label="Country dial code" placeholder={dialCode} />
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
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

