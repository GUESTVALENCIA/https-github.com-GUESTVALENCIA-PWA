
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils';

// --- TOOLS DEFINITION ---

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

const endCallTool: FunctionDeclaration = {
    name: 'endCall',
    parameters: {
        type: Type.OBJECT,
        description: 'Ends the call. Use ONLY when the user has explicitly confirmed they have no more questions and said goodbye.',
        properties: {
            reason: { type: Type.STRING, description: 'Reason for ending the call' }
        }
    }
};

const SANDRA_SYSTEM_PROMPT = `
IDENTIDAD:
Eres Sandra, recepcionista de GuestsValencia.

DIRECTRIZ DE VOZ Y ACENTO:
1. Habla con acento CASTELLANO (España).
2. Usa vocabulario de España (Coche, Móvil, Ordenador, Vale).
3. Sé profesional pero cercana.

MISION:
Atención al cliente 7 estrellas.

SALUDO INICIAL OBLIGATORIO:
Nada más empezar, di:
"Hola, buenas. Soy Sandra de Guests Valencia. ¿En qué puedo ayudarte hoy?"
`;

// --- CARTESIA CLIENT (ROBUST) ---
class CartesiaClient {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private voiceId: string;
    private audioContext: AudioContext | null = null;
    private nextStartTime: number = 0;
    public isConnected = false;

    constructor(apiKey: string, voiceId: string) {
        this.apiKey = apiKey;
        this.voiceId = voiceId;
    }

    setAudioContext(ctx: AudioContext) {
        this.audioContext = ctx;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (!this.isConnected) {
                    this.ws?.close();
                    reject(new Error("Cartesia Connection Timeout"));
                }
            }, 5000);

            try {
                this.ws = new WebSocket('wss://api.cartesia.ai/tts/websocket?cartesia_version=2024-06-10');
                this.ws.binaryType = 'arraybuffer';

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log("🟢 Cartesia WS Connected");
                    this.isConnected = true;
                    this.ws?.send(JSON.stringify({ api_key: this.apiKey, cartesia_version: "2024-06-10" }));
                    resolve();
                };

                this.ws.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error("🔴 Cartesia WS Error", e);
                    this.isConnected = false;
                    reject(e);
                };

                this.ws.onclose = () => {
                    console.log("Cartesia WS Closed");
                    this.isConnected = false;
                };

                this.ws.onmessage = async (event) => {
                    const data = event.data;
                    if (data instanceof ArrayBuffer && this.audioContext) {
                        await this.playAudio(data);
                    }
                };
            } catch (e) {
                clearTimeout(timeout);
                reject(e);
            }
        });
    }

    sendText(text: string) {
        if (!this.isConnected || !this.ws) return;
        
        const payload = {
            model_id: "sonic-multilingual",
            transcript: text,
            voice: { mode: "id", id: this.voiceId },
            output_format: { container: "raw", encoding: "pcm_f32le", sample_rate: 44100 },
            continue: true
        };
        this.ws.send(JSON.stringify(payload));
    }

    private async playAudio(arrayBuffer: ArrayBuffer) {
        if (!this.audioContext) return;

        const float32Data = new Float32Array(arrayBuffer);
        const buffer = this.audioContext.createBuffer(1, float32Data.length, 44100);
        buffer.getChannelData(0).set(float32Data);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        
        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;
    }

    disconnect() {
        this.ws?.close();
        this.isConnected = false;
    }
}


export class GeminiLiveService {
  private ai: GoogleGenAI;
  private apiKey: string;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private outputGain: GainNode | null = null;
  
  // Cartesia Integration
  private cartesiaClient: CartesiaClient | null = null;
  private useCartesia = false;
  private cartesiaApiKey = "";
  private cartesiaVoiceId = "";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  public configureCartesia(apiKey: string, voiceId: string) {
      this.useCartesia = true;
      this.cartesiaApiKey = apiKey;
      this.cartesiaVoiceId = voiceId;
  }

  public setCustomVoiceFile(file: Blob) {
      // Legacy
  }

  // --- VEO VIDEO GENERATION ---
  public async generateAvatarVideo(imageBlob: Blob, mode: 'LISTENING' | 'SEARCHING'): Promise<string> {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    });
    reader.readAsDataURL(imageBlob);
    const base64Data = await base64Promise;

    let prompt = "";
    if (mode === 'LISTENING') {
        prompt = `Professional video of a receptionist named Sandra in an office. She is looking directly at the camera, listening attentively. An iPhone is visible on the table in front of her, set to hands-free speaker mode. She nods occasionally. High quality, photorealistic, 4k, cinematic lighting. Loopable.`;
    } else {
        prompt = `Professional video of Sandra the receptionist in an office. She looks down and slightly to the side at a computer screen, typing briefly or checking information, focused on work. Then she glances back at the camera briefly. iPhone visible on desk. Photorealistic, 4k.`;
    }
    
    let operation = await this.ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      image: { imageBytes: base64Data, mimeType: 'image/jpeg' },
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await this.ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    const response = await fetch(`${videoUri}&key=${this.apiKey}`);
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

    // 1. ATTEMPT CARTESIA CONNECTION FIRST
    let cartesiaReady = false;
    if (this.useCartesia && this.cartesiaApiKey && this.cartesiaVoiceId) {
        try {
            console.log("🔌 Galaxy: Attempting Cartesia Handshake...");
            this.cartesiaClient = new CartesiaClient(this.cartesiaApiKey, this.cartesiaVoiceId);
            await this.cartesiaClient.connect();
            cartesiaReady = true;
            console.log("✅ Cartesia Ready");
        } catch (e) {
            console.warn("⚠️ Cartesia Connection Failed (Falling back to Native Voice):", e);
            this.useCartesia = false; 
            cartesiaReady = false;
            this.cartesiaClient = null;
        }
    } else {
        this.useCartesia = false;
    }

    // 2. SETUP AUDIO CONTEXTS
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
    
    // Fallback logic: If Cartesia, use standard rate. If Gemini Native, use 24k.
    const outRate = this.useCartesia ? undefined : 24000; 
    this.outputAudioContext = new AudioContextClass(outRate ? { sampleRate: outRate } : {});
    
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    this.outputGain = this.outputAudioContext.createGain();
    this.outputGain.connect(this.outputAudioContext.destination);

    if (cartesiaReady && this.cartesiaClient) {
        this.cartesiaClient.setAudioContext(this.outputAudioContext);
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } 
      });
    } catch (e) {
      console.error("Mic Access Error:", e);
      onStatusChange('ERROR');
      return;
    }

    console.log("🔌 Galaxy System: Connecting to Gemini. Mode:", this.useCartesia ? "HYBRID (CARTESIA)" : "NATIVE");

    // CRITICAL FIX: Always use AUDIO modality. Text modality is not supported in Live API.
    // If using Cartesia, we will suppress the native audio and use the transcription.
    const responseModalities = [Modality.AUDIO];

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: async () => {
          onStatusChange('CONNECTED');
          
          const session = await this.sessionPromise;
          
          if (this.inputAudioContext) {
            const source = this.inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                this.sessionPromise?.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext.destination);
          }

          setTimeout(() => {
              session.send({
                  parts: [{ text: "SYSTEM: Di exactamente: 'Hola, buenas. Soy Sandra de Guests Valencia. ¿En qué puedo ayudarte hoy?'" }],
                  turnComplete: true
              });
          }, 500);
        },
        onmessage: async (message: LiveServerMessage) => {
            // A. AUDIO HANDLING
            // If using Cartesia, we IGNORE the audio output from Gemini (mute it).
            // If NOT using Cartesia, we play it.
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && !this.useCartesia) {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
                const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), this.outputAudioContext!, 24000, 1);
                const source = this.outputAudioContext!.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputGain!);
                source.addEventListener('ended', () => this.sources.delete(source));
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
            }

            // B. TRANSCRIPTION & CARTESIA ROUTING
            const outputText = message.serverContent?.outputTranscription?.text;
            if (outputText) {
                 onMessage(outputText, false);
                 // If using Cartesia, use this text to generate audio
                 if (this.useCartesia && this.cartesiaClient?.isConnected) {
                     this.cartesiaClient.sendText(outputText);
                 }
            }

            // C. TOOLS
            if (message.toolCall) {
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
        onclose: () => {
            console.log("Gemini Session Closed");
            onStatusChange('DISCONNECTED');
        },
        onerror: (e) => { 
            console.error("Gemini Error:", e); 
            // Only report error if we aren't already closing
            onStatusChange('ERROR'); 
        }
      },
      config: {
        responseModalities: responseModalities, 
        // Enable transcription to support Cartesia routing
        outputAudioTranscription: {}, 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
        systemInstruction: SANDRA_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [checkAvailabilityTool, manageAccessControlTool, notifyStaffTool, sendWhatsAppTool, setVisualStateTool, endCallTool] }]
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
    this.cartesiaClient?.disconnect();
    this.sources.forEach(s => s.stop());
    this.sources.clear();
  }
}
