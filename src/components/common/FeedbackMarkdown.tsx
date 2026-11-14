import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FeedbackMarkdownProps {
  content: string;
  className?: string;
  placeholder?: string;
}

export function FeedbackMarkdown({
  content,
  className = '',
  placeholder = 'No feedback provided.',
}: FeedbackMarkdownProps) {
  if (!content || !content.trim()) {
    return <p className="text-slate-400 italic text-sm">{placeholder}</p>;
  }

  return (
    <div className={`prose prose-slate prose-sm max-w-none break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
