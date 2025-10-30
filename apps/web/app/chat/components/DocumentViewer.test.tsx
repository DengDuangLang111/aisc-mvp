import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DocumentViewer } from './DocumentViewer'

describe('DocumentViewer', () => {
  describe('Empty State', () => {
    it('显示空状态当没有 fileUrl 时', () => {
      render(<DocumentViewer />)
      
      expect(screen.getByText('没有文档')).toBeInTheDocument()
      expect(screen.getByText('上传文件后可以在这里查看')).toBeInTheDocument()
      expect(screen.getByText('上传文档')).toBeInTheDocument()
    })

    it('空状态包含跳转到上传页面的链接', () => {
      render(<DocumentViewer />)
      
      const uploadLink = screen.getByRole('link', { name: '上传文档' })
      expect(uploadLink).toHaveAttribute('href', '/upload')
    })
  })

  describe('Document Header', () => {
    it('显示文件名在 header 中', () => {
      render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/test.pdf" 
          filename="测试文档.pdf"
        />
      )
      
      expect(screen.getByText('测试文档.pdf')).toBeInTheDocument()
    })

    it('显示"新窗口打开"链接', () => {
      render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/test.pdf" 
          filename="test.pdf"
        />
      )
      
      const openLink = screen.getByRole('link', { name: '新窗口打开' })
      expect(openLink).toHaveAttribute('href', 'http://localhost:4000/uploads/test.pdf')
      expect(openLink).toHaveAttribute('target', '_blank')
      expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('PDF Files', () => {
    it('使用 iframe 显示 PDF 文件', () => {
      const { container } = render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/test.pdf" 
          filename="document.pdf"
        />
      )
      
      const iframe = container.querySelector('iframe')
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute('src', 'http://localhost:4000/uploads/test.pdf')
      expect(iframe).toHaveClass('w-full', 'h-full')
    })
  })

  describe('Image Files', () => {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp']

    imageFormats.forEach(format => {
      it(`显示 ${format.toUpperCase()} 图片文件`, () => {
        render(
          <DocumentViewer 
            fileUrl={`http://localhost:4000/uploads/image.${format}`}
            filename={`photo.${format}`}
          />
        )
        
        const img = screen.getByAltText(`photo.${format}`)
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', `http://localhost:4000/uploads/image.${format}`)
      })
    })
  })

  describe('Text Files', () => {
    const textFormats = ['txt', 'md', 'json', 'js', 'ts']

    textFormats.forEach(format => {
      it(`使用 iframe 显示 ${format.toUpperCase()} 文本文件`, () => {
        const { container } = render(
          <DocumentViewer 
            fileUrl={`http://localhost:4000/uploads/file.${format}`}
            filename={`code.${format}`}
          />
        )
        
        const iframe = container.querySelector('iframe')
        expect(iframe).toBeInTheDocument()
        expect(iframe).toHaveAttribute('src', `http://localhost:4000/uploads/file.${format}`)
        expect(iframe).toHaveClass('w-full', 'h-full', 'border')
      })
    })
  })

  describe('Unsupported Files', () => {
    it('显示下载选项对于不支持的文件类型', () => {
      render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/file.zip"
          filename="archive.zip"
        />
      )
      
      expect(screen.getByText('无法预览此文件')).toBeInTheDocument()
      expect(screen.getByText('请下载文件查看内容')).toBeInTheDocument()
      expect(screen.getByText(/archive.zip/)).toBeInTheDocument()
      
      const downloadLink = screen.getByRole('link', { name: '下载文件' })
      expect(downloadLink).toHaveAttribute('href', 'http://localhost:4000/uploads/file.zip')
      expect(downloadLink).toHaveAttribute('download')
    })
  })

  describe('File Extension Detection', () => {
    it('正确识别大写扩展名', () => {
      const { container } = render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/file.PDF"
          filename="DOCUMENT.PDF"
        />
      )
      
      const iframe = container.querySelector('iframe')
      expect(iframe).toBeInTheDocument()
    })

    it('处理没有扩展名的文件', () => {
      render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/file"
          filename="noextension"
        />
      )
      
      expect(screen.getByText('无法预览此文件')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('当 fileUrl 存在但 filename 不存在时显示文档', () => {
      render(
        <DocumentViewer fileUrl="http://localhost:4000/uploads/test.pdf" />
      )
      
      // 应该显示默认的 "文档" 文本
      expect(screen.getByText('文档')).toBeInTheDocument()
      expect(screen.getByText('正在查看')).toBeInTheDocument()
    })

    it('正确处理带多个点的文件名', () => {
      render(
        <DocumentViewer 
          fileUrl="http://localhost:4000/uploads/file.backup.txt"
          filename="document.backup.txt"
        />
      )
      
      expect(screen.getByText('document.backup.txt')).toBeInTheDocument()
    })
  })
})
