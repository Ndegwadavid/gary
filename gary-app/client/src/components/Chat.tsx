import { useState } from 'react'; 

interface Message {
  userId: string;
  text: string;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  userId: string;
  messages: Message[];
  sendMessage: (text: string) => void;
}

const Chat: React.FC<ChatProps> = ({ roomId, userId, messages, sendMessage }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="mt-4 bg-white bg-opacity-20 p-4 rounded-lg max-w-md mx-auto">
      <div className="h-40 overflow-y-auto mb-2">
        {messages.map((msg, index) => (
          <p key={index} className="text-sm">
            <span className="font-bold">{msg.userId.slice(0, 6)}:</span> {msg.text}
          </p>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 p-2 rounded-l text-black focus:outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-purple-600 text-white p-2 rounded-r hover:bg-purple-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;