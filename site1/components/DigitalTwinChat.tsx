'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const starterPrompts = [
  'What is your core career focus?',
  'What did you do at LTIMindtree?',
  'How did you modernize enterprise platforms?',
  'What makes you valuable in cloud transformation?',
];

export default function DigitalTwinChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello. I can answer questions about Bibhup Mishra’s background, leadership, cloud architecture journey, and transformation work.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await response.json();

      if (!response.ok || !data.answer) {
        throw new Error(data.error || 'Unable to get a response.');
      }

      setMessages([...nextMessages, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'I could not answer that right now. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  return (
    <div className="digital-twin-widget">
      {!isOpen ? (
        <button
          type="button"
          className="digital-twin-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open digital twin chat"
        >
          <span className="twin-avatar">AI</span>
          <span className="launcher-label">Twin</span>
        </button>
      ) : (
        <div className="digital-twin-popup card-panel">
          <div className="popup-header">
            <div className="popup-profile">
              <span className="popup-avatar">AI</span>
              <div>
                <p className="eyebrow">Digital twin</p>
                <h3>Ask about Bibhup</h3>
              </div>
            </div>
            <button
              type="button"
              className="close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close digital twin chat"
            >
              ×
            </button>
          </div>

          <div className="prompt-grid">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="prompt-button"
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-window">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && <div className="chat-bubble assistant loading">Thinking…</div>}
          </div>

          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Ask about his Azure experience, leadership, or transformation work..."
            />
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Thinking…' : 'Ask the digital twin'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
