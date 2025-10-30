import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} disabled>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Click me</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('applies primary variant styles', () => {
    render(<Button variant="primary">Click me</Button>)
    
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-blue-600')
  })

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Click me</Button>)
    
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-gray-600')
  })

  it('applies correct size styles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button').className).toContain('px-3 py-1.5')
    
    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('px-6 py-3')
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Click me</Button>)
    
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })
})
