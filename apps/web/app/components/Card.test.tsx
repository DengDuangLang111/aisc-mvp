import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card Component', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    )
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Card title="Test Card">
        <p>Content</p>
      </Card>
    )
    expect(screen.getByText('Test Card')).toBeInTheDocument()
  })

  it('does not render title section when title is not provided', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    )
    expect(container.querySelector('.border-b')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Card className="custom-class">
        <p>Content</p>
      </Card>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper styling classes', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-white')
    expect(card.className).toContain('rounded-lg')
    expect(card.className).toContain('shadow-md')
  })
})
