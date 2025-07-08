import React, { forwardRef } from 'react';
// Import 'Select' from react-select and alias it to avoid naming conflicts
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// You can keep your custom icon for other uses, but react-select has its own.
// import { ChevronDownIcon } from 'lucide-react'; 

export const ReactSelect = forwardRef(
  (
    {
      label,
      options,
      error,
      helperText,
      fullWidth = false,
      className = '', // This will now be passed to the main control element
      isCreatable = false, // New prop to switch to CreatableSelect
      // We can also accept react-select specific props like isMulti, isClearable, etc.
      ...props 
    },
    ref,
  ) => {
    const Component = isCreatable ? CreatableSelect : Select;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label 
            htmlFor={props.id || props.name} // Improve accessibility by linking label to the select
            className="block text-sm font-medium text-black mb-1"
          >
            {label}
          </label>
        )}
        
        <Component
          ref={ref}
          options={options}
          // The 'classNames' prop is the modern way to style react-select with Tailwind
          classNames={{
            // This is the main container element
            control: ({ isFocused }) =>
              `
                bg-white border rounded-md shadow-sm transition-colors
                ${error ? 'border-red-500' : isFocused ? 'border-transparent ring-2 ring-[#fbb832]' : 'border-black/20'}
                ${className}
              `,
            // The input field where text is typed
            input: () => 'text-black',
            // The placeholder text
            placeholder: () => 'text-gray-500',
            // The displayed value when an option is selected
            singleValue: () => 'text-black',
            // The dropdown menu
            menu: () => 'mt-1 bg-white border border-black/20 rounded-md shadow-lg',
            // Individual options in the dropdown
            option: ({ isFocused, isSelected }) =>
              `
                px-3 py-2 cursor-pointer
                ${isFocused ? 'bg-[#fbb832]/20' : ''}
                ${isSelected ? 'bg-[#fbb832] text-white' : 'text-black'}
              `,
            // The dropdown indicator (chevron icon)
            dropdownIndicator: () => 'text-gray-500 hover:text-gray-700',
            // The separator line next to the indicator
            indicatorSeparator: () => 'bg-black/20',
          }}
          // Pass all other props like onChange, value, isDisabled, etc.
          {...props} 
        />
        
        {/* Error and Helper text rendering remains the same */}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

ReactSelect.displayName = 'Select';