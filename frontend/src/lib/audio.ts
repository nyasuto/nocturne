export interface AudioSegment {
  id: number;
  audio_file: string;
  volume: number;
  fade_in_sec: number;
  fade_out_sec: number;
  duration_sec?: number;
}

export interface AudioEngineOptions {
  baseURL?: string;
  defaultVolume?: number;
  fadeStepMs?: number;
}

export class AudioEngine {
  public audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private fadeTimeouts: number[] = [];
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  
  private baseURL: string;
  private defaultVolume: number;
  private fadeStepMs: number;

  constructor(options: AudioEngineOptions = {}) {
    this.baseURL = options.baseURL || '/audio';
    this.defaultVolume = options.defaultVolume || 1.0;
    this.fadeStepMs = options.fadeStepMs || 50;
  }

  async initialize(): Promise<void> {
    if (this.audioContext) return;

    // Safari対応でwebkitAudioContextもチェック
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser');
    }

    this.audioContext = new AudioContextClass();
    
    // Safari対応: ユーザーインタラクションが必要な場合は再開
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // ゲインノード作成（音量制御用）
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = this.defaultVolume;
  }

  async loadAudio(audioFile: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioEngine is not initialized');
    }

    // キャッシュされたバッファがあれば返す
    if (this.audioBuffers.has(audioFile)) {
      return this.audioBuffers.get(audioFile)!;
    }

    try {
      const url = `${this.baseURL}/${audioFile}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // バッファをキャッシュ
      this.audioBuffers.set(audioFile, audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading audio file ${audioFile}:`, error);
      throw error;
    }
  }

  async playSegment(segment: AudioSegment): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('AudioEngine is not initialized');
    }

    // 前の音源を停止
    await this.stop();

    try {
      const audioBuffer = await this.loadAudio(segment.audio_file);
      
      // 新しいソースノード作成
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.gainNode);
      
      // 音量設定
      const targetVolume = segment.volume * this.defaultVolume;
      
      // フェードイン設定
      if (segment.fade_in_sec > 0) {
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(
          targetVolume,
          this.audioContext.currentTime + segment.fade_in_sec
        );
      } else {
        this.gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
      }

      // 再生開始
      this.currentSource.start(0);
      this.isPlaying = true;
      this.isPaused = false;
      this.startTime = this.audioContext.currentTime;

      // セグメントの長さが指定されている場合は自動停止
      if (segment.duration_sec) {
        const stopTime = segment.duration_sec - segment.fade_out_sec;
        
        if (stopTime > 0) {
          setTimeout(() => {
            if (this.isPlaying) {
              this.fadeOut(segment.fade_out_sec);
            }
          }, stopTime * 1000);
        }
      }

      // 再生終了時のコールバック
      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.isPaused = false;
      };

    } catch (error) {
      console.error('Error playing segment:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.clearFadeTimeouts();
    
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // 既に停止している場合のエラーを無視
        console.warn('Source already stopped:', error);
      }
      this.currentSource = null;
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  async pause(): Promise<void> {
    if (!this.isPlaying || this.isPaused) return;
    
    this.pauseTime = this.audioContext?.currentTime || 0;
    await this.stop();
    this.isPaused = true;
  }

  async resume(segment: AudioSegment): Promise<void> {
    if (!this.isPaused) return;
    
    // 一時停止した位置から再開
    // 注意: Web Audio APIでは完全な一時停止/再開は複雑なため、
    // 実際のアプリでは状態管理とセグメントの再読み込みが必要
    await this.playSegment(segment);
    this.isPaused = false;
  }

  setVolume(volume: number): void {
    if (!this.gainNode) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setValueAtTime(
      clampedVolume,
      this.audioContext?.currentTime || 0
    );
  }

  async fadeIn(duration: number, targetVolume: number = this.defaultVolume): Promise<void> {
    if (!this.gainNode || !this.audioContext) return;
    
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + duration
    );
  }

  async fadeOut(duration: number): Promise<void> {
    if (!this.gainNode || !this.audioContext) return;
    
    const currentVolume = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(currentVolume, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration
    );
    
    // フェードアウト完了後に停止
    setTimeout(() => {
      this.stop();
    }, duration * 1000);
  }

  private clearFadeTimeouts(): void {
    this.fadeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.fadeTimeouts = [];
  }

  // ステータス取得メソッド
  getState(): {
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    volume: number;
  } {
    const currentTime = this.audioContext ? 
      (this.isPlaying ? this.audioContext.currentTime - this.startTime : 0) : 0;
    
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime,
      volume: this.gainNode?.gain.value || 0
    };
  }

  // リソースクリーンアップ
  dispose(): void {
    this.stop();
    this.audioBuffers.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.gainNode = null;
  }
}

// シングルトンインスタンス
let audioEngineInstance: AudioEngine | null = null;

export const getAudioEngine = (options?: AudioEngineOptions): AudioEngine => {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine(options);
  }
  return audioEngineInstance;
};