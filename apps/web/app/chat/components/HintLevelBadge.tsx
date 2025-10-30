export interface HintLevelBadgeProps {
  level: 1 | 2 | 3
}

export function HintLevelBadge({ level }: HintLevelBadgeProps) {
  const config = {
    1: {
      emoji: '🤔',
      text: 'Level 1 - 轻微提示',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    2: {
      emoji: '💡',
      text: 'Level 2 - 中等提示',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    },
    3: {
      emoji: '✨',
      text: 'Level 3 - 详细提示',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
  }

  const { emoji, text, bgColor, textColor, borderColor } = config[level]

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bgColor} ${borderColor}`}>
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-medium ${textColor}`}>{text}</span>
    </div>
  )
}
