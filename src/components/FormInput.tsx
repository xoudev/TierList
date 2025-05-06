"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  type?: string;
  fullWidth?: boolean;
  rightElement?: React.ReactNode;
  labelClassName?: string;
  inputClassName?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      type = "text",
      fullWidth = true,
      rightElement,
      labelClassName = "",
      inputClassName = "",
      containerClassName = "",
      leftIcon,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${containerClassName}`}>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor={id}
            className={`block text-sm font-medium transition-colors duration-200 
              ${isFocused ? "text-indigo-400" : "text-gray-300"} 
              ${labelClassName}`}
          >
            {label}
          </label>
          {rightElement && rightElement}
        </div>
        <div className={`relative group ${error ? "animate-shake" : ""}`}>
          {/* Input Background Glow Effect */}
          <div
            className={`
            absolute -inset-0.5 rounded-lg bg-gradient-to-r opacity-0 blur-sm transition-all duration-300
            ${
              error
                ? "from-red-600 to-rose-600 opacity-40"
                : isFocused
                  ? "from-indigo-500 to-purple-600 opacity-50"
                  : "from-gray-700 to-gray-700"
            }
            ${isFocused && !error ? "opacity-50" : ""}
            ${props.disabled ? "opacity-0" : ""}
          `}
          ></div>

          <div className="relative">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span
                  className={`text-gray-400 transition-colors duration-200 ${isFocused ? "text-indigo-400" : ""}`}
                >
                  {leftIcon}
                </span>
              </div>
            )}

            <input
              ref={ref}
              id={id}
              name={id}
              type={type}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`
                w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2.5 px-4
                ${leftIcon ? "pl-10" : ""}
                placeholder:text-gray-400 placeholder:opacity-70
                focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none
                disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:border-gray-700
                shadow-sm transition-all duration-200
                backdrop-blur-sm
                hover:border-gray-500
                ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                ${inputClassName}
              `}
              {...props}
            />
          </div>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-400">{helperText}</p>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;
