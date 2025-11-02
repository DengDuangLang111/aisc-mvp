import { render, screen, fireEvent } from '@testing-library/react';
import { UploadHistory } from './UploadHistory';
import { UploadRecord } from '../../../lib/storage';

describe('UploadHistory', () => {
  const mockOnContinueWithFile = jest.fn();
  const mockOnDeleteRecord = jest.fn();
  const mockOnClearHistory = jest.fn();

  const mockRecords: UploadRecord[] = [
    {
      id: 'file-1',
      filename: 'test1.pdf',
      url: 'http://example.com/test1.pdf',
      uploadedAt: Date.now(),
      fileSize: 1024 * 100, // 100 KB
      fileType: 'application/pdf',
    },
    {
      id: 'file-2',
      filename: 'test2.txt',
      url: 'http://example.com/test2.txt',
      uploadedAt: Date.now() - 3600000, // 1 hour ago
      fileSize: 1024 * 1024 * 2, // 2 MB
      fileType: 'text/plain',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when uploadHistory is empty', () => {
    const { container } = render(
      <UploadHistory
        uploadHistory={[]}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render upload history with records', () => {
    render(
      <UploadHistory
        uploadHistory={mockRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('📚 最近上传')).toBeInTheDocument();
    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.txt')).toBeInTheDocument();
  });

  it('should display file size correctly', () => {
    render(
      <UploadHistory
        uploadHistory={mockRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('100.0 KB')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  it('should call onContinueWithFile when continue button clicked', () => {
    render(
      <UploadHistory
        uploadHistory={mockRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    const continueButtons = screen.getAllByText('继续学习');
    fireEvent.click(continueButtons[0]);

    expect(mockOnContinueWithFile).toHaveBeenCalledWith(mockRecords[0]);
  });

  it('should call onDeleteRecord when delete button clicked', () => {
    render(
      <UploadHistory
        uploadHistory={mockRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    const deleteButtons = screen.getAllByTitle('删除记录');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteRecord).toHaveBeenCalledWith('file-1');
  });

  it('should call onClearHistory when clear history button clicked', () => {
    render(
      <UploadHistory
        uploadHistory={mockRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    const clearButton = screen.getByText('清空历史');
    fireEvent.click(clearButton);

    expect(mockOnClearHistory).toHaveBeenCalledTimes(1);
  });

  it('should limit display to 10 records', () => {
    const manyRecords = Array.from({ length: 15 }, (_, i) => ({
      id: `file-${i}`,
      filename: `test${i}.pdf`,
      url: `http://example.com/test${i}.pdf`,
      uploadedAt: Date.now(),
      fileSize: 1024,
      fileType: 'application/pdf',
    }));

    render(
      <UploadHistory
        uploadHistory={manyRecords}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('还有 5 条历史记录未显示')).toBeInTheDocument();
  });

  it('should format recent time correctly', () => {
    const recentRecord: UploadRecord = {
      id: 'file-recent',
      filename: 'recent.pdf',
      url: 'http://example.com/recent.pdf',
      uploadedAt: Date.now() - 30000, // 30 seconds ago
      fileSize: 1024,
      fileType: 'application/pdf',
    };

    render(
      <UploadHistory
        uploadHistory={[recentRecord]}
        onContinueWithFile={mockOnContinueWithFile}
        onDeleteRecord={mockOnDeleteRecord}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });
});
