import React from 'react'

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50'
  const variantStyles = {
    primary:
      'bg-[#fbb832] hover:bg-[#fbb832]/90 text-black focus:ring-[#fbb832]',
    secondary:
      'bg-[#ff501c] hover:bg-[#ff501c]/90 text-white focus:ring-[#ff501c]',
    outline:
      'border border-black bg-transparent hover:bg-black/5 text-black focus:ring-black',
  }
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  }
  const widthStyles = fullWidth ? 'w-full' : ''
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}
