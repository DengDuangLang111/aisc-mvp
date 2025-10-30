import { ReactNode } from 'react'

export interface LayoutProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  centered?: boolean
  className?: string
}

export function Layout({ 
  children, 
  maxWidth = 'lg', 
  centered = true,
  className = '' 
}: LayoutProps) {
  const maxWidthStyles = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  }
  
  const centeredStyles = centered ? 'mx-auto' : ''
  
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className={`${maxWidthStyles[maxWidth]} ${centeredStyles} px-4 sm:px-6 lg:px-8 py-8`}>
        {children}
      </div>
    </div>
  )
}
