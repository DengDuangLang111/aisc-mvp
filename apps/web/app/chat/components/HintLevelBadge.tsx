export interface HintLevelBadgeProps {
  level: 1 | 2 | 3
  compact?: boolean
}

export function HintLevelBadge({ level, compact = false }: HintLevelBadgeProps) {
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
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-300',
    },
  }

  const { emoji, text, bgColor, textColor, borderColor } = config[level]

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${bgColor} ${borderColor}`}>
        <span>{emoji}</span>
        <span className={`font-medium ${textColor}`}>{text.split(' ')[1]}</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bgColor} ${borderColor}`}>
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-medium ${textColor}`}>{text}</span>
    </div>
  )
}
