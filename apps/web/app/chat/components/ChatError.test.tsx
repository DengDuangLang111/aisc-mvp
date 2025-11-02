import { render, screen } from '@testing-library/react';
import { ChatError } from './ChatError';

describe('ChatError', () => {
  it('should not render when error is null', () => {
    const { container } = render(<ChatError error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message when error exists', () => {
    const errorMessage = '发送失败 (500): 服务器错误';
    render(<ChatError error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should have correct error styling', () => {
    render(<ChatError error="测试错误" />);

    const errorDiv = screen.getByText('测试错误').parentElement;
    expect(errorDiv).toHaveClass('bg-red-50', 'border-red-500', 'text-red-700');
  });
});
