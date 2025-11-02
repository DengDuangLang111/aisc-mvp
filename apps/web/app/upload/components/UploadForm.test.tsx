import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadForm } from './UploadForm';

describe('UploadForm', () => {
  const mockOnUpload = jest.fn();
  const mockOnStartChat = jest.fn();
  const mockOnFileChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file input and upload button', () => {
    render(
      <UploadForm
        uploading={false}
        status=""
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    expect(screen.getByLabelText('选择文件')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上传文件' })).toBeInTheDocument();
  });

  it('should disable input and button when uploading', () => {
    render(
      <UploadForm
        uploading={true}
        status="正在上传..."
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    const fileInput = screen.getByLabelText('选择文件') as HTMLInputElement;
    const uploadButton = screen.getByRole('button', { name: '上传中...' });

    expect(fileInput).toBeDisabled();
    expect(uploadButton).toBeDisabled();
  });

  it('should display status message', () => {
    const status = '✅ 上传成功！文件：test.pdf';
    render(
      <UploadForm
        uploading={false}
        status={status}
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it('should display uploaded file info', () => {
    const uploadedFile = {
      id: 'file-123',
      filename: 'test.pdf',
      url: 'http://example.com/test.pdf',
    };

    render(
      <UploadForm
        uploading={false}
        status=""
        uploadedFile={uploadedFile}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('file-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始对话学习 →' })).toBeInTheDocument();
  });

  it('should call onStartChat when start chat button clicked', () => {
    const uploadedFile = {
      id: 'file-123',
      filename: 'test.pdf',
      url: 'http://example.com/test.pdf',
    };

    render(
      <UploadForm
        uploading={false}
        status=""
        uploadedFile={uploadedFile}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    const startChatButton = screen.getByRole('button', { name: '开始对话学习 →' });
    fireEvent.click(startChatButton);

    expect(mockOnStartChat).toHaveBeenCalledTimes(1);
  });

  it('should call onFileChange when file input changes', () => {
    render(
      <UploadForm
        uploading={false}
        status=""
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    const fileInput = screen.getByLabelText('选择文件') as HTMLInputElement;
    fireEvent.change(fileInput);

    expect(mockOnFileChange).toHaveBeenCalledTimes(1);
  });

  it('should apply success styling for success status', () => {
    render(
      <UploadForm
        uploading={false}
        status="✅ 上传成功！"
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    const statusDiv = screen.getByText('✅ 上传成功！').parentElement;
    expect(statusDiv).toHaveClass('bg-green-50', 'text-green-800');
  });

  it('should apply error styling for error status', () => {
    render(
      <UploadForm
        uploading={false}
        status="❌ 上传失败"
        uploadedFile={null}
        onUpload={mockOnUpload}
        onStartChat={mockOnStartChat}
        onFileChange={mockOnFileChange}
      />
    );

    const statusDiv = screen.getByText('❌ 上传失败').parentElement;
    expect(statusDiv).toHaveClass('bg-red-50', 'text-red-800');
  });
});
