"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export function PhoneField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <PhoneInput
      id={id}
      className="gojo-phone-field"
      defaultCountry="RU"
      international
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "+7 999 123-45-67"}
    />
  );
}
