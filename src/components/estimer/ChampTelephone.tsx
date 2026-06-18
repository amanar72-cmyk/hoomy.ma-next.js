"use client";

import "react-phone-number-input/style.css";
import PhoneInput, { type Value } from "react-phone-number-input";

interface Props {
  valeur: string;
  onChange: (val: string) => void;
}

export default function ChampTelephone({ valeur, onChange }: Props) {
  return (
    <div className="champ-tel-wrapper">
      <style>{`
        .champ-tel-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          border: 1.5px solid #EDE7D7;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .champ-tel-wrapper .PhoneInput:focus-within {
          border-color: #0F4C3A;
          box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.08);
        }
        .champ-tel-wrapper .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          background: #FAF7F0;
          border-right: 1.5px solid #EDE7D7;
          height: 48px;
          cursor: pointer;
        }
        .champ-tel-wrapper .PhoneInputCountrySelect {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .champ-tel-wrapper .PhoneInputCountryIcon {
          width: 22px;
          height: 16px;
          border-radius: 2px;
          overflow: hidden;
        }
        .champ-tel-wrapper .PhoneInputCountrySelectArrow {
          color: #9DB8AD;
          width: 8px;
          height: 8px;
        }
        .champ-tel-wrapper .PhoneInputInput {
          flex: 1;
          border: none !important;
          outline: none !important;
          padding: 0 16px;
          height: 48px;
          font-size: 15px;
          color: #1a2822;
          background: transparent;
          font-family: var(--font-outfit, sans-serif);
        }
        .champ-tel-wrapper .PhoneInputInput::placeholder {
          color: #B4AD97;
        }
      `}</style>
      <PhoneInput
        defaultCountry="MA"
        value={valeur as Value}
        onChange={(v) => onChange(v ?? "")}
        placeholder="+212 6 00 00 00 00"
        international
      />
    </div>
  );
}
