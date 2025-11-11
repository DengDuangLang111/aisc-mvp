import type { DocumentFaqItem } from '../../ocr/vision.service';

interface PageSnippet {
  pageNumber: number;
  content: string;
}

interface DocumentContextPayload {
  summary?: string | null;
  faq?: DocumentFaqItem[];
  pages: PageSnippet[];
}

export class DocumentContextHelper {
  private static readonly MAX_PAGE_SNIPPETS = 6;
  private static readonly MAX_FULLDOC_SNIPPETS = 12;
  private static readonly MAX_SNIPPET_LENGTH = 1200;
  private static readonly FULL_DOC_KEYWORDS = [
    '全文',
    '全篇',
    '全部',
    '整篇',
    'entire document',
    'whole document',
    'full document',
    'all pages',
    'translate all',
    'translate the whole',
    'translate entire',
  ];

  static buildContext(
    payload: DocumentContextPayload | null,
    userMessage: string,
  ): string | undefined {
    if (!payload) {
      return undefined;
    }

    const sections: string[] = [];

    if (payload.summary) {
      sections.push(`【文档概要】\n${payload.summary.trim()}`);
    }

    if (payload.faq?.length) {
      sections.push(this.formatFaq(payload.faq));
    }

    const pageSections = this.buildPageSections(
      payload.pages || [],
      userMessage,
    );
    sections.push(...pageSections);

    return sections.length > 0 ? sections.join('\n\n') : undefined;
  }

  private static formatFaq(faq: DocumentFaqItem[]): string {
    const limited = faq.slice(0, 5);
    const items = limited.map((item, index) => {
      const pageHint = item.pages?.length
        ? `（页码：${item.pages.join(', ')}）`
        : '';
      return `${index + 1}. Q: ${item.question}\n   A: ${item.answer}${pageHint}`;
    });
    return `【常见问题】\n${items.join('\n')}`;
  }

  private static buildPageSections(
    pages: PageSnippet[],
    message: string,
  ): string[] {
    if (!pages.length) {
      return [];
    }

    const chosenPages = this.selectRelevantPages(pages, message);

    return chosenPages.map((page) => {
      const trimmed = page.content.trim();
      const snippet =
        trimmed.length > this.MAX_SNIPPET_LENGTH
          ? `${trimmed.slice(0, this.MAX_SNIPPET_LENGTH)}…`
          : trimmed;
      return `【第${page.pageNumber}页】\n${snippet || '(该页未检测到可读文本)'}`;
    });
  }

  private static selectRelevantPages(
    pages: PageSnippet[],
    message: string,
  ): PageSnippet[] {
    const totalPages = pages.length;
    const pageMentions = this.extractPageNumbers(message, totalPages);
    if (pageMentions.length > 0) {
      const expanded = new Set<number>();
      for (const pageNumber of pageMentions) {
        expanded.add(pageNumber);
        if (pageNumber > 1) expanded.add(pageNumber - 1);
        if (pageNumber < totalPages) expanded.add(pageNumber + 1);
      }
      return pages
        .filter((page) => expanded.has(page.pageNumber))
        .slice(0, this.MAX_PAGE_SNIPPETS);
    }

    if (this.shouldUseFullDocument(message)) {
      return pages.slice(0, this.MAX_FULLDOC_SNIPPETS);
    }

    const keywords = this.extractKeywords(message);
    if (keywords.length === 0) {
      return pages.slice(0, this.MAX_PAGE_SNIPPETS);
    }

    const scored = pages
      .map((page) => ({
        page,
        score: this.scorePage(page.content, keywords),
      }))
      .sort((a, b) => b.score - a.score);

    const meaningful = scored.filter((entry) => entry.score > 0);
    if (meaningful.length === 0) {
      return pages.slice(0, this.MAX_PAGE_SNIPPETS);
    }

    return meaningful
      .slice(0, this.MAX_PAGE_SNIPPETS)
      .map((entry) => entry.page);
  }

  private static scorePage(content: string, keywords: string[]): number {
    const normalized = content.toLowerCase();
    return keywords.reduce((score, keyword) => {
      const term = keyword.toLowerCase();
      return normalized.includes(term) ? score + 1 : score;
    }, 0);
  }

  private static extractKeywords(message: string): string[] {
    if (!message) return [];

    const normalized = message.trim();
    const englishParts = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const chineseParts = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];

    const merged = [...englishParts, ...chineseParts];
    return Array.from(new Set(merged));
  }

  private static extractPageNumbers(
    message: string,
    maxPage: number,
  ): number[] {
    if (!message) return [];

    const matches = new Set<number>();
    const regexes = [
      /第\s*(\d+)\s*页/gi,
      /page\s*(\d+)/gi,
      /\bp\s*(\d+)\b/gi,
      /页\s*(\d+)/gi,
    ];

    for (const regex of regexes) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(message))) {
        const value = Number(match[1]);
        if (Number.isInteger(value) && value >= 1 && value <= maxPage) {
          matches.add(value);
        }
      }
    }

    return Array.from(matches).sort((a, b) => a - b);
  }

  private static shouldUseFullDocument(message: string): boolean {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return this.FULL_DOC_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
    );
  }
}
