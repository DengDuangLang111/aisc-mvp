import { Injectable, Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type {
  ChatResponse,
  HintLevel,
} from './chat.types';
import { ChatRequestDto } from './dto/chat-request.dto';

@Injectable()
export class ChatService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 处理聊天请求
   * 核心逻辑：根据对话历史判断提示等级，返回渐进式提示
   */
  async chat(request: ChatRequestDto): Promise<ChatResponse> {
    const { message, conversationHistory = [] } = request;

    this.logger.log('info', 'Processing chat request', {
      context: 'ChatService',
      messageLength: message.length,
      historyCount: conversationHistory.length,
    });

    // 计算当前提示等级
    // 逻辑：统计用户已经问了多少次相关问题
    const userMessageCount = conversationHistory.filter(
      (msg) => msg.role === 'user',
    ).length;

    const hintLevel = this.calculateHintLevel(userMessageCount);

    this.logger.log('info', `Calculated hint level: ${hintLevel}`, {
      context: 'ChatService',
      userMessageCount,
      hintLevel,
    });

    // 生成回复（目前是硬编码，后面会接入 AI API）
    const reply = this.generateHintResponse(message, hintLevel);

    return {
      reply,
      hintLevel,
      timestamp: Date.now(),
    };
  }

  /**
   * 根据用户提问次数计算提示等级
   * 0-1次 → Level 1 (轻微提示)
   * 2-3次 → Level 2 (中等提示)
   * 4+次  → Level 3 (详细提示，但不给答案)
   */
  private calculateHintLevel(userMessageCount: number): HintLevel {
    if (userMessageCount <= 1) return 1;
    if (userMessageCount <= 3) return 2;
    return 3;
  }

  /**
   * 根据提示等级生成回复
   * 这里先用硬编码演示，后面会接入 OpenAI/Claude
   */
  private generateHintResponse(message: string, hintLevel: HintLevel): string {
    // Level 1: 轻微提示，只给方向
    if (hintLevel === 1) {
      return `🤔 这是一个好问题！让我给你一个提示：\n\n试着思考这个问题的关键概念是什么。你可以从定义和基本原理入手。\n\n如果还有困难，可以继续问我，我会给你更具体的指导。`;
    }

    // Level 2: 中等提示，给出思路和步骤
    if (hintLevel === 2) {
      return `💡 看来你需要更多帮助，让我给你一些具体的思路：\n\n1. 首先，确定问题中的已知条件\n2. 然后，思考需要求什么\n3. 考虑用什么方法或公式可以连接已知和未知\n4. 尝试一步步推导\n\n你可以先试试这些步骤，如果还有问题，我可以给你更详细的指导。`;
    }

    // Level 3: 详细提示，接近答案但不直接给出
    return `✨ 好的，让我给你更详细的指导：\n\n根据你的问题，关键在于理解底层的原理。让我们一起分析：\n\n• 这个问题涉及的核心概念包括...\n• 常见的解决方法是...\n• 你可以这样思考：假设...\n• 推导过程的关键步骤是...\n\n虽然我不能直接给你答案，但希望这些提示能帮你自己找到解决方法！💪 继续努力！`;
  }
}
