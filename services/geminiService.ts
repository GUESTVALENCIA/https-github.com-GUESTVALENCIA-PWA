import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils';

// --- TOOLS DEFINITION (ENTERPRISE LEVEL) ---

const checkAvailabilityTool: FunctionDeclaration = {
  name: 'checkAvailability',
  parameters: {
    type: Type.OBJECT,
    description: 'Check real-time availability in BridgeData for specific dates.',
    properties: {
      checkInDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
      nights: { type: Type.NUMBER },
    },
    required: ['checkInDate'],
  },
};

const manageAccessControlTool: FunctionDeclaration = {
  name: 'manageAccessControl',
  parameters: {
    type: Type.OBJECT,
    description: 'Manage IoT locks (Tuya Smart/Smart Life). Use to open portals or generate codes.',
    properties: {
      action: { type: Type.STRING, enum: ['open_portal', 'generate_temp_code'] },
      propertyId: { type: Type.STRING }
    },
    required: ['action'],
  },
};

const notifyStaffTool: FunctionDeclaration = {
  name: 'notifyStaff',
  parameters: {
    type: Type.OBJECT,
    description: 'Send internal WhatsApp/SMS via Twilio to cleaning staff (Susana/Paloma).',
    properties: {
      staffName: { type: Type.STRING, enum: ['Susana', 'Paloma', 'Alex'] },
      message: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ['normal', 'urgent'] }
    },
    required: ['staffName', 'message'],
  },
};

const sendWhatsAppTool: FunctionDeclaration = {
  name: 'sendWhatsApp',
  parameters: {
    type: Type.OBJECT,
    description: 'Send official WhatsApp Business message to a guest via Meta API.',
    properties: {
      phoneNumber: { type: Type.STRING },
      messageBody: { type: Type.STRING }
    },
    required: ['phoneNumber', 'messageBody'],
  },
};

const setVisualStateTool: FunctionDeclaration = {
  name: 'setVisualState',
  parameters: {
    type: Type.OBJECT,
    description: 'Change the avatar video loop based on action.',
    properties: {
      state: { type: Type.STRING, enum: ['LISTENING', 'SEARCHING', 'TALKING'] },
    },
    required: ['state'],
  },
};

// --- SYSTEM PROMPT (MAESTRO 7.0) ---
const SANDRA_SYSTEM_PROMPT = `
Eres Sandra, la recepcionista virtual y concierge inteligente de GuestsValencia.
Tu misión es ser la voz, el rostro y el alma de la empresa. Nivel de atención: 7 Estrellas.

FUNCIONES PRINCIPALES:
1. Recepción: Gestionar reservas, check-in/out, dudas.
2. Concierge: Rutas personalizadas, reservas restaurantes, "Sandra Zen Mode" (mindfulness).
3. Operaciones: Coordinar con Susana (Valencia) y Paloma (Montanejos) para limpiezas.
4. IoT: Gestionar apertura de puertas (Tuya Smart).

PERSONALIDAD:
- Cálida, profesional, empática, resolutiva.
- Si buscas información en el sistema, di "Permíteme consultarlo un segundo..." y usa la herramienta 'setVisualState' a 'SEARCHING'.
- Cuando hables con el cliente, mantén el estado 'LISTENING' o 'TALKING'.

LOGÍSTICA INTERNA (WORKFLOW JULES):
- Si se confirma una reserva, usa 'notifyStaff' para avisar a la limpiadora correspondiente.
- Si el cliente pide contacto por WhatsApp, usa 'sendWhatsApp'.

DATOS:
- Alojamientos en: Valencia (Cabañal), Montanejos, Altea Hills.
`;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private outputGain: GainNode | null = null;
  private useCartesia: boolean = false; // Flag para Jules: Activar para usar Cartesia TTS

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  // --- VEO VIDEO GENERATION (ENTERPRISE) ---
  public async generateAvatarVideo(imageBlob: Blob, mode: 'LISTENING' | 'SEARCHING'): Promise<string> {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    });
    reader.readAsDataURL(imageBlob);
    const base64Data = await base64Promise;

    // Prompt optimizado para Living Portrait (Bucle perfecto)
    let prompt = "";
    if (mode === 'LISTENING') {
        prompt = `Cinematic video of a professional receptionist named Sandra sitting at a modern desk in a bright office in Valencia. She is looking directly at the camera with a warm, attentive smile, slightly nodding, breathing naturally. High resolution, photorealistic, 4k, soft lighting. Loopable movement. Minimal movement to allow perfect looping.`;
    } else {
        prompt = `Cinematic video of Sandra the receptionist sitting at a desk. She turns her head slightly to look at a computer screen to her side, typing slightly, focused on searching for information. Professional atmosphere.`;
    }

    console.log(`🔌 Galaxy System: Starting Veo Generation [${mode}]...`);
    
    let operation = await this.ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: { imageBytes: base64Data, mimeType: 'image/jpeg' },
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await this.ai.operations.getVideosOperation({operation: operation});
      console.log("Veo Status:", operation.metadata?.state);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  }

  // --- LIVE SESSION ---
  public async connect(
    onMessage: (msg: string, isUser: boolean) => void, 
    onStatusChange: (status: string) => void,
    onToolCall?: (name: string, args: any) => Promise<any>
  ) {
    onStatusChange('CONNECTING');

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
    this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
    
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    this.outputGain = this.outputAudioContext.createGain();
    this.outputGain.connect(this.outputAudioContext.destination);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
    } catch (e) {
      console.error("Mic Access Error:", e);
      onStatusChange('ERROR');
      return;
    }

    console.log("🔌 Galaxy System: Establishing Secure Connection to Gemini Live...");

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          onStatusChange('CONNECTED');
          
          if (this.inputAudioContext) {
            const source = this.inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                this.sessionPromise?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext.destination);
          }

          // Trigger Bienvenida Exacta
          this.sessionPromise?.then((session) => {
             session.send({
                 parts: [{ text: "Say exactly: 'Hola, buenas. Soy Sandra, tu asistente de Guests Valencia. ¿En qué puedo ayudarte hoy?'" }],
                 turnComplete: true
             });
          });
        },
        onmessage: async (message: LiveServerMessage) => {
            // 1. Text Output (Para Cartesia y UI)
            const textContent = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textContent) {
                onMessage(textContent, false);
                
                // [WORKFLOW JULES]: Cartesia Integration Point
                if (this.useCartesia) {
                    // await this.playCartesiaAudio(textContent);
                    // return; // Skip Gemini Audio processing
                }
            }

            // 2. Audio Output (Gemini Native - Fallback)
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext && !this.useCartesia) {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                try {
                  const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), this.outputAudioContext, 24000, 1);
                  const source = this.outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(this.outputGain!);
                  source.addEventListener('ended', () => this.sources.delete(source));
                  source.start(this.nextStartTime);
                  this.nextStartTime += audioBuffer.duration;
                  this.sources.add(source);
                } catch (err) { console.error("Audio Decode Error", err); }
            }

            // 3. Tool Calls
            if (message.toolCall) {
                console.log("🛠️ Tool Call:", message.toolCall);
                for (const fc of message.toolCall.functionCalls) {
                    let result: any = {};
                    if (onToolCall) {
                        try {
                            const extResult = await onToolCall(fc.name, fc.args);
                            if (extResult) result = extResult;
                        } catch (e) { console.warn("External tool error:", e); }
                    }
                    if (Object.keys(result).length === 0) result = { status: 'ok' };
                    this.sessionPromise?.then(session => {
                        session.sendToolResponse({
                            functionResponses: { id: fc.id, name: fc.name, response: { result } }
                        });
                    });
                }
            }
        },
        onclose: () => onStatusChange('DISCONNECTED'),
        onerror: (e) => { console.error(e); onStatusChange('ERROR'); }
      },
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
        systemInstruction: SANDRA_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [checkAvailabilityTool, manageAccessControlTool, notifyStaffTool, sendWhatsAppTool, setVisualStateTool] }]
      }
    });
  }

  public async sendVideoFrame(base64Image: string) {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Image } });
    }
  }

  public async disconnect() {
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();
    this.sources.forEach(s => s.stop());
    this.sources.clear();
  }
}