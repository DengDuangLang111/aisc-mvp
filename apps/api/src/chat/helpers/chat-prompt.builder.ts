import type { HintLevel } from '@study-oasis/contracts';

/**
 * ChatPromptBuilder
 *
 * 负责构建聊天提示词和相关文本生成
 * - 系统提示词构建（根据提示等级和文档上下文）
 * - 对话标题生成
 * - 提示等级计算
 * - Fallback 回复生成
 */
export class ChatPromptBuilder {
  /**
   * 构建系统提示词
   * @param hintLevel 提示等级 (1-3)
   * @param hasDocument 是否有文档上下文
   * @returns 系统提示词
   */
  static buildSystemPrompt(hintLevel: HintLevel, hasDocument: boolean): string {
    const basePrompt = `你是一个专业的学习助手，帮助学生理解和解决学习问题。

你的目标是：
1. 引导学生自主思考，而不是直接给出答案
2. 根据学生的理解程度调整提示深度
3. 鼓励学生探索和发现解决方案

${hasDocument ? '当前对话关联了一个文档，你可以参考文档内容提供更准确的指导。\n' : ''}
关键信息处理要求：
- 提示词会提供「文档概要 / 常见问题 / 逐页片段」，当回答引用文档时请标注对应的【标签】或页码。
- 如果用户给出明确的命令（如“翻译全文”“列出第3页内容”“把PDF总结成要点”），不要重复追问，直接执行；对于较长的操作，可按页或按段分批输出并说明进度。
- 若在给定上下文中找不到答案，要坦诚说明并建议下一步（例如让用户提供页码或补充信息）。`;

    const hintPrompts: Record<HintLevel, string> = {
      1: `${basePrompt}
**当前提示等级：轻度提示**
- 提供问题的大方向和思路
- 引导学生识别关键概念
- 提出启发性问题，帮助学生自己找到答案
- 避免直接给出具体步骤或答案

示例：
学生："这道题怎么做？"
你："让我们先分析一下，这道题考察的核心概念是什么？你能识别出来吗？"`,

      2: `${basePrompt}
**当前提示等级：中度提示**
- 提供更具体的思路和方法
- 可以给出部分步骤或框架
- 指出可能的解题方向
- 仍然鼓励学生完成关键步骤

示例：
学生："我不知道从哪里开始。"
你："这类问题通常可以分为以下几个步骤：1) 理解题意，2) 识别已知条件，3) 应用相关公式。你能先尝试第一步吗？"`,

      3: `${basePrompt}
**当前提示等级：详细提示**
- 提供详细的解题步骤
- 可以给出具体的方法和公式
- 解释每一步的原理
- 但仍要求学生理解和验证

示例：
学生："我试了很多次还是不会。"
你："好的，让我详细讲解。首先，这道题需要用到XX公式：[公式]。第一步是...第二步是...你跟着这个思路试试，有问题随时问我。"`,
    };

    return hintPrompts[hintLevel];
  }

  /**
   * 生成对话标题（从第一条消息提取）
   * @param message 用户消息
   * @returns 对话标题
   */
  static generateConversationTitle(message: string): string {
    // 取前 50 个字符作为标题
    const title = message.slice(0, 50);
    return title.length < message.length ? `${title}...` : title;
  }

  /**
   * 计算提示等级（根据对话轮次）
   * @param userMessageCount 用户消息数量
   * @returns 提示等级 (1-3)
   */
  static calculateHintLevel(userMessageCount: number): HintLevel {
    if (userMessageCount <= 1) return 1;
    if (userMessageCount <= 3) return 2;
    return 3;
  }

  /**
   * 生成 Fallback 回复（当 AI 服务不可用时）
   * @param message 用户消息（可用于未来的个性化回复）
   * @returns Fallback 回复文本
   */
  static generateFallbackResponse(message: string): string {
    return `🤔 感谢你的提问！由于 AI 服务暂时不可用，这里是一些通用建议：

1. **理解问题**：确保你完全理解了问题要求
2. **寻找关键概念**：识别问题中的核心概念和术语
3. **回顾相关知识**：复习与问题相关的基础知识
4. **尝试分解问题**：将复杂问题分解为更小的子问题
5. **使用资源**：查阅教科书、笔记或在线资源

如果你继续遇到困难，请稍后再试，我的 AI 功能应该会恢复。💪`;
  }
}
