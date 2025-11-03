import type { SpeechStateExternalEvent } from "speechstate";
import type { AnyActorRef } from "xstate";

// NEW: Message interface
export interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

export interface UserProfile {
  answers: { q: string; a: string }[];
  bigFive?: Record<string, number>;
  archetype?: string;
  interactionCount?: number;
}

export interface DMContext {
  spstRef: AnyActorRef;
  lastResult: string;
  informationState: { latestMove: string };
  messages: Message[];
  // new:
  personalityRef?: AnyActorRef;
  userProfile?: UserProfile;
  questionIndex?: number;
  questions?: string[];
  mood?: "neutral" | "chaotic" | "mystic" | "playful" | "dark";
  temperature?: number;
  currentModel?: string;
  noinputCounter?: number;
  top_k?: number;
}

export type DMEvents =
  | SpeechStateExternalEvent
  | { type: "CLICK" }
  | { type: "SAYS"; value: string }
  | { type: "NEXT_MOVE"; value: string }
  | { type: "DONE" };

  
