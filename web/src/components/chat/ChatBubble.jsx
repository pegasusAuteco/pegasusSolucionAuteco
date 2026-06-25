/**
 * Chat message bubble component.
 *
 * Renders user and assistant messages with distinct styling.
 * Supports basic markdown bold formatting and voice message playback.
 * Auto-plays recent voice messages from the assistant.
 */
import VoiceMessagePlayer from './VoiceMessagePlayer';

function isVeryRecent(createdAt) {
  return Date.now() - new Date(createdAt).getTime() < 60_000;
}

export default function ChatBubble({ message, sender, text, timestamp }) {
  const isIA = message ? message.role === 'assistant' : sender === 'IA';
  const displayContent = message ? message.content : (text || '');
  const displayTimestamp = message
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (timestamp || '');

  const isVoice = message?.message_type === 'voice' && message?.audio_id;
  const shouldAutoPlay = isIA && isVoice && isVeryRecent(message.created_at);

  const renderMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`flex ${isIA ? 'justify-start' : 'justify-end animate-fade-in-up'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-md transition-colors duration-300 ${
          isIA
            ? 'bg-gray-100 text-auteco-blue border border-transparent dark:bg-gray-900 dark:border-gray-800 dark:text-gray-200 rounded-tl-none'
            : 'bg-auteco-blue text-white rounded-tr-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMarkdown(displayContent)}</p>
        {isVoice && (
          <VoiceMessagePlayer
            src={`/api/voice/audio/${message.audio_id}`}
            autoPlay={shouldAutoPlay}
            accent={isIA ? '#E10600' : '#0ea5e9'}
          />
        )}
        {displayTimestamp && (
          <span
            className={`text-[10px] mt-1 block ${
              isIA ? 'text-gray-400 dark:text-gray-500' : 'text-blue-200'
            }`}
          >
            {displayTimestamp}
          </span>
        )}
      </div>
    </div>
  );
}
