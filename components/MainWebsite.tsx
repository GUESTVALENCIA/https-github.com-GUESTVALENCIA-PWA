
import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { playRingTone, playPickupSound, playHangupSound, MediaStorage } from '../utils';
import LiveInterface from './LiveInterface';
import { BookingData } from '../types';
import Notification from './Notification';

// Assets
const LOGO_URL = "400PngdpiLogo.png"; 
// High quality office image for the Hero
const SANDRA_STATIC_IMG = "watermarked-0a8e9d54-9782-4b86-a2c1-f7625ceba785.jpg";

const APARTMENTS = [
    { id: 1, title: "Ático Cabañal Beach", price: 120, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", features: "2 Hab • Terraza • Vistas al Mar" },
    { id: 2, title: "Loft Industrial Puerto", price: 95, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", features: "1 Hab • Diseño • Smart Lock" },
    { id: 3, title: "Casa Típica Marinera", price: 150, img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80", features: "3 Hab • Patio • Histórico" }
];

const MainWebsite: React.FC = () => {
  // --- STATE ---
  const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const [transcripts, setTranscripts] = useState<{text: string, isUser: boolean}[]>([]);
  const [avatarMode, setAvatarMode] = useState<'LISTENING' | 'SEARCHING'>('LISTENING');
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  
  // Assets
  const [heroImage, setHeroImage] = useState(SANDRA_STATIC_IMG); 
  const [heroVideoSrc, setHeroVideoSrc] = useState<string | null>(null);
  const [searchVideoSrc, setSearchVideoSrc] = useState<string | null>(null);
  
  // Cartesia Configuration State
  const [cartesiaApiKey, setCartesiaApiKey] = useState("");
  const [cartesiaVoiceId, setCartesiaVoiceId] = useState("");
  
  const [bookingData, setBookingData] = useState<BookingData>({ pricePerNight: 120, available: true, guestCount: 2, discountApplied: false });
  const [showAdmin, setShowAdmin] = useState(false); // Hidden by default for immersive exp

  // --- REFS ---
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const ringToneRef = useRef<{ stop: () => void } | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // --- DERIVED STATE ---
  const isLive = callState === 'LIVE' || callState === 'CONNECTING';

  // --- INITIALIZATION ---
  useEffect(() => {
      const loadAssets = async () => {
          try {
              const savedVideo = await MediaStorage.getFile('video_listening');
              if (savedVideo instanceof Blob) {
                  setHeroVideoSrc(URL.createObjectURL(savedVideo));
              }
              const savedSearchVideo = await MediaStorage.getFile('video_searching');
              if (savedSearchVideo instanceof Blob) {
                  setSearchVideoSrc(URL.createObjectURL(savedSearchVideo));
              }
              // Try to load saved Cartesia keys
              const savedCartesiaKey = localStorage.getItem('cartesia_api_key');
              const savedCartesiaVoice = localStorage.getItem('cartesia_voice_id');
              if (savedCartesiaKey) setCartesiaApiKey(savedCartesiaKey);
              if (savedCartesiaVoice) setCartesiaVoiceId(savedCartesiaVoice);

          } catch (e) { console.log("No assets to restore", e); }
      };
      loadAssets();
  }, []);

  // --- LOGIC TO SWITCH VIDEO BASED ON STATE ---
  useEffect(() => {
      if (heroVideoRef.current && isLive) {
          const targetSrc = avatarMode === 'SEARCHING' && searchVideoSrc ? searchVideoSrc : heroVideoSrc;
          if (targetSrc && heroVideoRef.current.src !== targetSrc) {
              const currentTime = heroVideoRef.current.currentTime;
              heroVideoRef.current.src = targetSrc;
              heroVideoRef.current.currentTime = 0; // Loop start
              heroVideoRef.current.play().catch(e => console.log("Video switch error", e));
          }
      }
  }, [avatarMode, isLive, heroVideoSrc, searchVideoSrc]);

  // --- HANDLERS ---
  const ensureApiKey = async (): Promise<string | undefined> => {
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await window.aistudio.openSelectKey(); } catch (e) { return undefined; }
        }
    }
    return process.env.API_KEY;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        setHeroImage(url);
        setNotification({ message: "Foto de Sandra actualizada. Ahora genera el vídeo.", type: 'success' });
    }
  };
  
  const handleCartesiaSave = () => {
      if (cartesiaApiKey && cartesiaVoiceId) {
          localStorage.setItem('cartesia_api_key', cartesiaApiKey);
          localStorage.setItem('cartesia_voice_id', cartesiaVoiceId);
          setNotification({ message: "Configuración de Cartesia guardada.", type: 'success' });
      } else {
          setNotification({ message: "Faltan datos de Cartesia.", type: 'error' });
      }
  };

  const handleVeoGeneration = async (mode: 'LISTENING' | 'SEARCHING') => {
      const apiKey = await ensureApiKey();
      if (!apiKey) {
          setNotification({ message: "Conecta tu API Key Pro para usar Veo.", type: 'error' });
          return;
      }
      
      const service = new GeminiLiveService(apiKey);
      try {
          const imgResp = await fetch(heroImage);
          const blob = await imgResp.blob();
          
          setNotification({ message: `Generando vídeo (${mode}) con Veo Pro... Esto tarda 1-2 min.`, type: 'info' });
          const videoUrl = await service.generateAvatarVideo(blob, mode);
          
          const videoBlob = await (await fetch(videoUrl)).blob();
          const storageKey = mode === 'LISTENING' ? 'video_listening' : 'video_searching';
          
          await MediaStorage.saveFile(storageKey, videoBlob);
          
          if (mode === 'LISTENING') setHeroVideoSrc(videoUrl);
          else setSearchVideoSrc(videoUrl);

          setNotification({ message: `¡Video ${mode} Generado y Guardado!`, type: 'success' });
      } catch (e) {
          console.error(e);
          setNotification({ message: "Error generando video. Revisa permisos API.", type: 'error' });
      }
  };

  const startCall = async (e?: React.MouseEvent) => {
    // 1. CRITICAL FIX: PREVENT DEFAULT & BLUR INPUTS TO STOP JUMP
    if (e) e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    const apiKey = await ensureApiKey();
    if (!apiKey) {
        setNotification({ message: "API Key requerida para llamada.", type: 'error' });
        return;
    }

    setCallState('RINGING');
    ringToneRef.current = playRingTone();

    // 2 Rings (approx 3s)
    setTimeout(async () => {
        if (ringToneRef.current) ringToneRef.current.stop();
        playPickupSound(); // CLACK
        
        setCallState('CONNECTING');
        setShowAdmin(false); 
        
        // Transition: Play Video
        if (heroVideoRef.current && heroVideoSrc) {
            try {
                heroVideoRef.current.currentTime = 0;
                heroVideoRef.current.muted = true; 
                await heroVideoRef.current.play();
            } catch (e) {
                console.log("Autoplay blocked", e);
            }
        }

        if (!liveServiceRef.current) {
            liveServiceRef.current = new GeminiLiveService(apiKey);
            // CONFIGURAR CARTESIA SI HAY CREDENCIALES
            if (cartesiaApiKey && cartesiaVoiceId) {
                liveServiceRef.current.configureCartesia(cartesiaApiKey, cartesiaVoiceId);
                console.log("🚀 Cartesia Mode Activated");
            }
        }
        
        try {
            await liveServiceRef.current.connect(
                (text, isUser) => setTranscripts(prev => [...prev.slice(-2), { text, isUser }]),
                (status) => {
                    if (status === 'CONNECTED') setCallState('LIVE');
                    if (status === 'DISCONNECTED') endCall();
                    if (status === 'ERROR') {
                      setCallState('ERROR');
                      setNotification({ message: "Conexión perdida.", type: 'error' });
                    }
                },
                async (toolName, args) => { 
                    if (toolName === 'setVisualState') setAvatarMode(args.state);
                    // --- TOOL: END CALL (Initiated by AI) ---
                    if (toolName === 'endCall') {
                        // Delay slightly to let the "Goodbye" audio finish playing from the AI
                        setTimeout(() => {
                            endCall();
                        }, 2000); 
                    }
                    return { success: true }; 
                }
            );
        } catch (e) {
            console.error(e);
            setCallState('ERROR');
            setNotification({ message: "Error de conexión.", type: 'error' });
        }
    }, 3000); 
  };

  const endCall = async () => {
      // 1. PLAY HANGUP SOUND (Audible Feedback)
      playHangupSound();

      if (liveServiceRef.current) {
          await liveServiceRef.current.disconnect();
          liveServiceRef.current = null;
      }
      if (ringToneRef.current) ringToneRef.current.stop();
      if(callState === 'ERROR') setNotification(null);
      setCallState('IDLE');
      setTranscripts([]);
      setAvatarMode('LISTENING');
      
      if (heroVideoRef.current) {
          heroVideoRef.current.pause();
      }
  };

  const handleVideoFrame = (base64: string) => {
      if (callState === 'LIVE' && liveServiceRef.current) {
          liveServiceRef.current.sendVideoFrame(base64);
      }
  };

  return (
    // Main container: White background for the whole page
    <div className="font-sans text-slate-900 bg-white min-h-screen flex flex-col relative overflow-x-hidden">
        
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        
        {/* --- NAVBAR GALAXY --- */}
        <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-black/30 backdrop-blur-2xl border-b border-white/10 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="#home" className="flex items-center gap-2 group min-w-[150px]">
                    <img src={LOGO_URL} alt="Guests Valencia" className="h-10 object-contain filter invert brightness-0 invert opacity-100" />
                </a>
                
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-100 drop-shadow-md">
                    <a href="https://wa.me/34624020085" target="_blank" rel="noreferrer" 
                       className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-full hover:opacity-90 transition-opacity font-bold shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                        WhatsApp
                    </a>
                    <a href="#home" className="hover:text-blue-400 transition-colors shadow-black/50">Inicio</a>
                    <a href="#alojamientos" className="hover:text-blue-400 transition-colors shadow-black/50">Alojamientos</a>
                    <a href="#servicios" className="hover:text-blue-400 transition-colors shadow-black/50">Servicios</a>
                    <a href="#propietarios" className="hover:text-blue-400 transition-colors shadow-black/50">Propietarios</a>
                    <a href="#contacto" className="hover:text-blue-400 transition-colors shadow-black/50">Contacto</a>
                    <a href="https://app.guestsvalencia.es" className="hover:text-blue-400 transition-colors shadow-black/50">App</a>
                </div>

                <div className="flex gap-4 items-center">
                    <button onClick={() => setShowAdmin(!showAdmin)} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>
        </nav>

        <main className="flex-1">
            {/* --- HERO SECTION (FIXED HEIGHT, NO SCROLL) --- */}
            <section id="home" className="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-black">
                
                {/* 1. VIDEO LAYER */}
                <video 
                    ref={heroVideoRef}
                    className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-1000 ease-in-out ${isLive ? 'opacity-100' : 'opacity-0'}`}
                    muted 
                    loop 
                    playsInline 
                />

                {/* 2. IMAGE LAYER */}
                <div 
                    className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 transition-opacity duration-1000 ease-in-out ${isLive ? 'opacity-0' : 'opacity-100'}`}
                    style={{ 
                        backgroundImage: `url('${heroImage}')`,
                        filter: 'brightness(1.05) contrast(1.05)' 
                    }}
                />
                
                {/* 3. GRADIENT */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-20 pointer-events-none transition-opacity duration-700 ${isLive ? 'opacity-0' : 'opacity-100'}`}></div>

                {/* 4. LIVE HUD (Transparent Layer) */}
                {/* Aquí es donde suceden los controles, sobre la imagen estática */}
                {(callState === 'LIVE' || callState === 'CONNECTING' || callState === 'RINGING' || callState === 'ERROR') && (
                    <div className="absolute inset-0 z-40 pointer-events-none">
                        <LiveInterface 
                            onEndCall={endCall}
                            bookingData={bookingData}
                            messages={transcripts}
                            onVideoFrame={handleVideoFrame}
                            avatarMode={avatarMode}
                        />
                    </div>
                )}

                {/* 5. SEARCH BOX (Fades out in place, DOES NOT MOVE DOWN) */}
                <div className={`absolute z-30 w-full px-4 max-w-4xl mx-auto bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 transition-opacity duration-700 ${isLive || callState === 'RINGING' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    
                    <p className="text-base md:text-xl text-white font-sans font-bold mb-3 tracking-wide drop-shadow-lg text-center text-glow">
                        Gestión premium, llegada autónoma y asistencia exclusiva IA 24/7
                    </p>
                    
                    <div className="bg-black/30 backdrop-blur-2xl border border-white/10 p-2 md:p-3 rounded-2xl shadow-2xl shadow-black/80 flex flex-col md:flex-row gap-2 items-end">
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="relative group text-left">
                                <label className="text-[10px] text-slate-300 uppercase font-bold ml-2 mb-1 block drop-shadow-sm">Destino</label>
                                <input type="text" placeholder="Valencia, Ruzafa..." className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-400 outline-none focus:bg-black/70 focus:border-blue-500 transition-all font-medium text-sm" />
                            </div>
                            <div className="relative group text-left">
                                <label className="text-[10px] text-slate-300 uppercase font-bold ml-2 mb-1 block drop-shadow-sm">Fechas</label>
                                <input type="date" className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:bg-black/70 focus:border-blue-500 transition-all font-medium text-sm" />
                            </div>
                            <div className="relative group text-left">
                                <label className="text-[10px] text-slate-300 uppercase font-bold ml-2 mb-1 block drop-shadow-sm">Huéspedes</label>
                                <input type="number" placeholder="2" className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:bg-black/70 focus:border-blue-500 transition-all font-medium text-sm" />
                            </div>
                        </div>
                        
                        <div className="w-full md:w-auto">
                            <button 
                                onClick={startCall}
                                type="button"
                                className="w-full md:w-auto h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group relative overflow-hidden whitespace-nowrap text-sm border border-white/10"
                            >
                                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                                <svg className="w-4 h-4 relative z-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                <span className="relative z-10">Buscar con IA</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ADMIN CONTROLS (CARTESIA UPDATE) */}
                <div className={`absolute top-28 right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300 ${showAdmin ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
                    <div className="glass-dark p-4 rounded-2xl border border-white/10 shadow-2xl w-72 backdrop-blur-xl bg-black/90 text-white">
                        <h4 className="font-bold text-xs uppercase mb-3 text-blue-300 flex items-center gap-2">
                            <span>🛠️ Galaxy Admin</span>
                        </h4>
                        
                        <div className="mb-4 space-y-2">
                             <div className="text-[10px] text-slate-400 font-bold uppercase">Cartesia Sonic TTS</div>
                             <input 
                                type="text" 
                                placeholder="Cartesia API Key"
                                value={cartesiaApiKey}
                                onChange={(e) => setCartesiaApiKey(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                             />
                             <input 
                                type="text" 
                                placeholder="Voice ID (e.g. 248...)"
                                value={cartesiaVoiceId}
                                onChange={(e) => setCartesiaVoiceId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                             />
                             <button onClick={handleCartesiaSave} className="w-full py-1 bg-green-600/50 hover:bg-green-600 text-white text-[10px] rounded transition-colors">
                                 Guardar Configuración Voz
                             </button>
                        </div>

                        <div className="flex gap-2 mb-3">
                            <label className="flex-1 py-3 bg-white/10 text-white text-[10px] font-bold rounded-lg hover:bg-white/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border border-white/10">
                                <span className="text-xl">📷</span>
                                <span>Subir Foto</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div className="space-y-2 mb-3">
                            <button onClick={() => handleVeoGeneration('LISTENING')} className="w-full py-2 bg-gradient-to-r from-purple-900 to-indigo-900 text-white text-[10px] font-bold rounded-lg hover:brightness-110 border border-white/10 flex items-center justify-center gap-2">
                                <span>✨</span> Generar Video (Call)
                            </button>
                            <button onClick={() => handleVeoGeneration('SEARCHING')} className="w-full py-2 bg-gradient-to-r from-blue-900 to-cyan-900 text-white text-[10px] font-bold rounded-lg hover:brightness-110 border border-white/10 flex items-center justify-center gap-2">
                                <span>💻</span> Generar Video (Search)
                            </button>
                        </div>
                        
                        <button onClick={ensureApiKey} className="w-full py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-all border border-white/10">
                            🔑 Conectar API (Pro)
                        </button>
                    </div>
                </div>
            </section>

            {/* SECTIONS... */}
            <section className="py-20 px-6 bg-white border-b border-slate-100 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-4 leading-tight">
                        Alojamientos con alma en la <br/><span className="text-blue-600">Comunidad Valenciana</span>
                    </h2>
                    <p className="text-slate-500 text-lg uppercase tracking-widest font-medium mt-6">
                        Valencia • Castellón • Alicante
                    </p>
                </div>
            </section>

            <section id="alojamientos" className="py-24 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {APARTMENTS.map(apt => (
                            <div key={apt.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10">
                                <div className="h-64 overflow-hidden relative">
                                    <img src={apt.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={apt.title} />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-900 border border-slate-200 shadow-sm">
                                        Destacado
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{apt.title}</h3>
                                    <p className="text-slate-500 text-sm mb-6">{apt.features}</p>
                                    <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                                        <div>
                                            <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Desde</span>
                                            <span className="text-2xl font-bold text-blue-600">{apt.price}€</span>
                                            <span className="text-slate-500 text-sm">/noche</span>
                                        </div>
                                        <button className="text-sm font-bold text-slate-900 underline decoration-blue-500 underline-offset-4 hover:text-blue-600 transition-colors">Reservar</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

        </main>

        <footer id="contacto" className="bg-white text-slate-600 py-16 border-t border-slate-200">
            <div className="w-full px-8 md:px-12 grid md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                    <img src={LOGO_URL} alt="Guests Valencia" className="h-10 opacity-100 mb-6 filter invert-0" />
                    <p className="text-sm max-w-xs leading-relaxed mt-4 text-slate-500">
                        Redefiniendo la hospitalidad en Valencia con tecnología e inteligencia artificial.
                    </p>
                </div>
                <div>
                    <h4 className="text-slate-900 font-bold mb-4">Enlaces</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#home" className="hover:text-blue-600 transition-colors">Inicio</a></li>
                        <li><a href="#alojamientos" className="hover:text-blue-600 transition-colors">Alojamientos</a></li>
                        <li><a href="#servicios" className="hover:text-blue-600 transition-colors">Servicios</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-slate-900 font-bold mb-4">Contacto</h4>
                    <ul className="space-y-2 text-sm">
                        <li>Valencia, España</li>
                        <li>+34 624 020 085</li>
                        <li>info@guestsvalencia.com</li>
                    </ul>
                </div>
            </div>
            <div className="w-full px-8 md:px-12 pt-12 mt-12 border-t border-slate-200 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center text-slate-500">
                <p>© 2024 Guests Valencia. Todos los derechos reservados.</p>
                <p className="mt-4 md:mt-0 opacity-50">Powered by Gemini 3.0 & Galaxy System</p>
            </div>
        </footer>
    </div>
  );
};

export default MainWebsite;
