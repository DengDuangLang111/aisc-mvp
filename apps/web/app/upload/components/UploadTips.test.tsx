import { render, screen } from '@testing-library/react';
import { UploadTips } from './UploadTips';

describe('UploadTips', () => {
  it('should render tips title', () => {
    render(<UploadTips />);
    expect(screen.getByText('💡 使用提示')).toBeInTheDocument();
  });

  it('should render all tip items', () => {
    render(<UploadTips />);

    expect(screen.getByText(/支持的文件格式/)).toBeInTheDocument();
    expect(screen.getByText(/上传成功后点击/)).toBeInTheDocument();
    expect(screen.getByText(/AI 会根据你的文件内容/)).toBeInTheDocument();
    expect(screen.getByText(/提供渐进式提示/)).toBeInTheDocument();
    expect(screen.getByText(/上传记录会自动保存/)).toBeInTheDocument();
  });

  it('should render as a list', () => {
    const { container } = render(<UploadTips />);
    const list = container.querySelector('ul');
    const listItems = container.querySelectorAll('li');

    expect(list).toBeInTheDocument();
    expect(listItems).toHaveLength(5);
  });
});
