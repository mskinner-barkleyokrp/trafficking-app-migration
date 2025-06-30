import React, { forwardRef } from 'react'

export const Input = forwardRef(
  (
    { label, error, helperText, fullWidth = false, className = '', ...props },
    ref,
  ) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label className="block text-sm font-medium text-black mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-black/20'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#fbb832] focus:border-transparent ${fullWidth ? 'w-full' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
