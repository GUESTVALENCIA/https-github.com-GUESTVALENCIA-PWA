import React, { useState, useEffect, useRef } from 'react';

interface GalaxyWidgetProps {
  onStartCall: () => void;
}

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  type?: 'text' | 'call-request';
}

const GalaxyWidget: React.FC<GalaxyWidgetProps> = ({ onStartCall }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "¡Hola! Soy Sandra, tu asistente de GuestsValencia. 🏠✨", sender: 'bot', type: 'text' },
    { id: 2, text: "¿En qué puedo ayudarte hoy con tu alojamiento?", sender: 'bot', type: 'text' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setHasUnread(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    // 1. User Message
    const newUserMsg: Message = { id: Date.now(), text: inputText, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText("");
    setIsTyping(true);

    // 2. Bot Simulation Flow (Section 9 Compliance)
    setTimeout(() => {
      setIsTyping(false);
      const botResponse: Message = {
        id: Date.now() + 1,
        text: "Entiendo perfectamente. Para darte una atención 7 estrellas y explicarte los detalles mejor, ¿te parece bien que hablemos por videollamada ahora mismo?",
        sender: 'bot',
        type: 'call-request'
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end font-sans">
      
      {/* --- CHAT WINDOW (Active State) --- */}
      <div 
        className={`
          mb-4 w-[350px] max-w-[90vw] h-[500px] max-h-[70vh] flex flex-col
          bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-[2px]">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" 
                  alt="Sandra" 
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Sandra IA</h3>
              <p className="text-blue-200 text-xs flex items-center gap-1">
                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                GuestsValencia Support
              </p>
            </div>
          </div>
          <button onClick={toggleWidget} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/20">
          <div className="text-center text-xs text-slate-500 my-2">Hoy</div>
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'}
              `}>
                {msg.text}
                
                {msg.type === 'call-request' && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        onStartCall();
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg transform hover:scale-105"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Aceptar llamada
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 border border-white/5 flex gap-1 items-center">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <form onSubmit={handleSendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputText.trim()}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>

      {/* --- ORB BUTTON (Inactive State) --- */}
      <button 
        onClick={toggleWidget}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform duration-300 border border-white/20"
      >
        {/* Ripple Effect */}
        <span className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping group-hover:opacity-40"></span>
        
        {/* Icon Change */}
        <div className={`transition-all duration-300 absolute ${isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
           <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </div>
        <div className={`transition-all duration-300 absolute ${!isOpen ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
           <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>

        {/* Unread Indicator */}
        {hasUnread && !isOpen && (
           <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-black rounded-full animate-bounce"></span>
        )}
      </button>

    </div>
  );
};

export default GalaxyWidget;