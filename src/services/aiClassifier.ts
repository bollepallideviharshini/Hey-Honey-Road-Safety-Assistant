import type { HazardType } from '../types';

export interface ClassificationResult {
  isTriggered: boolean;
  rawText: string;
  normalizedText: string;
  hazardType: HazardType | null;
  confidence: number;
  confirmationMessage: string;
}

// Map keywords to hazard types
const HAZARD_KEYWORDS: Record<HazardType, string[]> = {
  accident: ['accident', 'crash', 'wreck', 'collision', 'accident reported', 'car crash', 'accident on the road'],
  water: ['water', 'flood', 'flooding', 'leak', 'deep water', 'water log', 'water leak'],
  rain: ['rain', 'raining', 'rainy', 'shower', 'downpour', 'storm', 'rain storm'],
  road: ['road', 'pothole', 'pot hole', 'damage', 'construction', 'road damage', 'broken road', 'hazard road'],
  fight: ['fight', 'fighting', 'street fight', 'riot', 'brawl', 'fight reported', 'altercation', 'people fighting']
};

// Generates dynamic confirmation sentences
export function generateConfirmationMessage(type: HazardType): string {
  const messages: Record<HazardType, string[]> = {
    accident: [
      "Accident Reported Successfully! Simulated emergency notifications dispatched.",
      "Accident logged. Notifying emergency services in simulation mode.",
      "Warning: Accident detected. Simulated assistance is on the way."
    ],
    water: [
      "Water hazard registered. Wet road conditions reported ahead.",
      "Water build-up detected. Drive cautiously.",
      "Water on road reported. Hydroplaning risk is elevated."
    ],
    rain: [
      "Rain reported. Slippery roads expected.",
      "Weather update: Rain logged. Reduce your speed.",
      "Rain conditions verified. Safe travels."
    ],
    road: [
      "Road damage registered. Watch out for potholes or debris.",
      "Road hazard reported. Construction or damage detected.",
      "Pothole or road surface warning logged successfully."
    ],
    fight: [
      "Alert: Altercation logged. Stand clear of the area.",
      "Disturbance reported. Keep your distance and stay safe.",
      "Fight registered. Avoid the vicinity for your safety."
    ]
  };

  const pool = messages[type];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function classifySpeech(text: string): ClassificationResult {
  const normalized = text.toLowerCase().trim();
  
  // Trigger phrase check
  const triggerPhrases = ['hey honey', 'hay honey', 'hi honey', 'hello honey', 'hey money', 'okay honey', 'ok honey', 'hey running', 'hey hummy', 'hey horny', 'hey bunny', 'honey'];
  
  let isTriggered = false;
  let textAfterTrigger = normalized;

  for (const phrase of triggerPhrases) {
    if (normalized.startsWith(phrase)) {
      isTriggered = true;
      textAfterTrigger = normalized.substring(phrase.length).trim();
      break;
    } else {
      const idx = normalized.indexOf(phrase);
      if (idx !== -1) {
        isTriggered = true;
        textAfterTrigger = normalized.substring(idx + phrase.length).trim();
        break;
      }
    }
  }

  // If not triggered, ignore unless the transcript is exactly one of the commands (e.g. accident, fight)
  if (!isTriggered) {
    const directMatch = Object.keys(HAZARD_KEYWORDS).find(k => normalized === k) as HazardType | undefined;
    if (directMatch) {
      isTriggered = true;
      textAfterTrigger = normalized;
    } else {
      return {
        isTriggered: false,
        rawText: text,
        normalizedText: normalized,
        hazardType: null,
        confidence: 0,
        confirmationMessage: 'Listening...'
      };
    }
  }

  // Check direct matches
  let detectedType: HazardType | null = null;
  let maxMatchScore = 0;

  for (const [type, keywords] of Object.entries(HAZARD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textAfterTrigger.includes(keyword) || textAfterTrigger === type) {
        detectedType = type as HazardType;
        maxMatchScore = 1.0;
        break;
      }
    }
    if (detectedType) break;
  }

  // Fuzzy distance check
  if (!detectedType) {
    const words = textAfterTrigger.split(/\s+/);
    for (const word of words) {
      for (const [type, keywords] of Object.entries(HAZARD_KEYWORDS)) {
        if (keywords.includes(word) || word === type) {
          detectedType = type as HazardType;
          maxMatchScore = 0.8;
          break;
        }
        for (const kw of keywords) {
          const distance = levenshteinDistance(word, kw);
          if (distance <= 1 && word.length > 3) {
            detectedType = type as HazardType;
            maxMatchScore = 0.7;
            break;
          }
        }
        if (detectedType) break;
      }
      if (detectedType) break;
    }
  }

  if (detectedType) {
    return {
      isTriggered: true,
      rawText: text,
      normalizedText: textAfterTrigger,
      hazardType: detectedType,
      confidence: maxMatchScore,
      confirmationMessage: generateConfirmationMessage(detectedType)
    };
  }

  return {
    isTriggered: true,
    rawText: text,
    normalizedText: textAfterTrigger,
    hazardType: null,
    confidence: 0.1,
    confirmationMessage: 'Unsupported hazard. Speak: "Hey Honey Accident", "Water", "Rain", "Road", or "Fight".'
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (b[j - 1] === a[i - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
