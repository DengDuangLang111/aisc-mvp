interface ChatErrorProps {
  error: string | null;
}

export function ChatError({ error }: ChatErrorProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 mx-4 mt-4 flex-shrink-0">
      <p className="text-sm">{error}</p>
    </div>
  );
}
