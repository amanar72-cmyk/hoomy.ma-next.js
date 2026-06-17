"use client";

// Wrapper isolé autour de react-phone-number-input pour permettre
// un import dynamique avec ssr:false depuis les formulaires.
// Ne pas importer directement — utiliser dynamic() à la place.
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default PhoneInput;
