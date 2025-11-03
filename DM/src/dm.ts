import { assign, createActor, raise, setup } from "xstate";
import { speechstate } from "speechstate";
import type { AnyActorRef } from "xstate";
import type { Settings } from "speechstate";
import { fromPromise } from "xstate/actors";
import type { DMEvents, DMContext, Message } from "./types";
import { KEY} from "./azure";

export const psychQuestions = [
  "Do you enjoy meeting new people or prefer staying alone?",
  "Tell me a secret about yourself in one word.",
  "I challenge you: say the first thing that comes to mind.",
  "What kind of activities make you feel most alive?",
  "How do you typically handle stressful situations?",
  "What's your approach to making important decisions?",
  "What do you value most in your friendships?",
  "How do you recharge after a long day?",
  "What kind of environments help you be most productive?",
  "What are your thoughts on taking risks and trying new things?",
  "When you have free time, what do you most enjoy doing?",
  "How do you express your creativity?",
  "What qualities do you admire in other people?",
  "How do you handle conflicts or disagreements?",
  "What does your ideal weekend look like?",
  "What kind of books, movies, or music do you enjoy most?",
  "How do you approach learning new things?",
  "What makes you feel accomplished or satisfied?"
];

// 📊 FUNCTIONS

function archetypeToMBTI(archetype: string): string {
  const mapping: { [key: string]: string } = {
    "The Creator": "INFP",
    "The Explorer": "ENFP", 
    "The Sage": "INTJ",
    "The Caregiver": "ISFJ",
    "The Lover": "ENFJ",
    "The Ruler": "ENTJ",
    "The Jester": "ESFP",
    "The Hero": "ESTP",
    "The Everyman": "ISFP",
    "The Rebel": "ENTP",
    "The Magician": "INFJ",
    "The Seeker": "ENFP"
  };
  return mapping[archetype] || "INFP";
}

function detectArchetypeFromStatement(statement: string): { archetype: string, confidence: string, traits: string[], scores: { [key: string]: number } } {
  const text = statement.toLowerCase();
  const traits: string[] = [];
  
  // Initialize all 12 archetype scores
  let creatorScore = 0, explorerScore = 0, sageScore = 0, caregiverScore = 0, 
      rulerScore = 0, jesterScore = 0, loverScore = 0, heroScore = 0, 
      everymanScore = 0, rebelScore = 0, magicianScore = 0, innocentScore = 0;

  // 🎨 The Creator - artistic, innovative, imaginative, expressive
  if (text.includes('art') || text.includes('creative') || text.includes('create') || text.includes('design')) {
    creatorScore += 4;
    traits.push("artistic", "innovative");
  }
  if (text.includes('paint') || text.includes('draw') || text.includes('sketch') || text.includes('sculpt')) {
    creatorScore += 3;
    traits.push("expressive", "craftsman");
  }
  if (text.includes('music') || text.includes('compose') || text.includes('song') || text.includes('melody') || text.includes('david bowie')) {
    creatorScore += 3;
    traits.push("musical", "harmonious");
  }
  if (text.includes('write') || text.includes('poem') || text.includes('story') || text.includes('novel') || text.includes('imagine')) {
    creatorScore += 3;
    traits.push("imaginative", "storyteller");
  }
  if (text.includes('invent') || text.includes('build') || text.includes('make') || text.includes('craft')) {
    creatorScore += 2;
    traits.push("inventive", "builder");
  }

  // 🗺️ The Explorer - adventurous, curious, nature-loving, independent
  if (text.includes('adventure') || text.includes('explore') || text.includes('discover') || text.includes('journey')) {
    explorerScore += 4;
    traits.push("adventurous", "exploratory");
  }
  if (text.includes('travel') || text.includes('trip') || text.includes('voyage') || text.includes('wander')) {
    explorerScore += 3;
    traits.push("traveler", "nomadic");
  }
  if (text.includes('nature') || text.includes('hiking') || text.includes('outdoor') || text.includes('wild') || text.includes('mountain')) {
    explorerScore += 3;
    traits.push("nature-loving", "outdoorsy");
  }
  if (text.includes('new') || text.includes('try') || text.includes('experience') || text.includes('different')) {
    explorerScore += 2;
    traits.push("curious", "open-minded");
  }
  if (text.includes('free') || text.includes('independent') || text.includes('autonomous') || text.includes('self-reliant')) {
    explorerScore += 2;
    traits.push("independent", "free-spirited");
  }

  // 📚 The Sage - introverted, thoughtful, knowledge-seeking, analytical
  if (text.includes('learn') || text.includes('study') || text.includes('research') || text.includes('knowledge')) {
    sageScore += 4;
    traits.push("knowledgeable", "studious");
  }
  if (text.includes('book') || text.includes('read') || text.includes('library') || text.includes('literature')) {
    sageScore += 3;
    traits.push("well-read", "literary");
  }
  if (text.includes('think') || text.includes('philosophy') || text.includes('wisdom') || text.includes('contemplate')) {
    sageScore += 3;
    traits.push("thoughtful", "philosophical");
  }
  if (text.includes('introvert') || text.includes('alone') || text.includes('quiet') || text.includes('solitude') || text.includes('reflect')) {
    sageScore += 3;
    traits.push("introspective", "reflective");
  }
  if (text.includes('analyze') || text.includes('logic') || text.includes('reason') || text.includes('understand')) {
    sageScore += 2;
    traits.push("analytical", "logical");
  }

  // ❤️ The Caregiver - helpful, supportive, empathetic, nurturing
  if (text.includes('help') || text.includes('care') || text.includes('support') || text.includes('nurture')) {
    caregiverScore += 4;
    traits.push("caring", "supportive");
  }
  if (text.includes('family') || text.includes('friend') || text.includes('community') || text.includes('together')) {
    caregiverScore += 3;
    traits.push("family-oriented", "community-focused");
  }
  if (text.includes('empathy') || text.includes('compassion') || text.includes('kind') || text.includes('understanding')) {
    caregiverScore += 3;
    traits.push("empathetic", "compassionate");
  }
  if (text.includes('protect') || text.includes('safe') || text.includes('secure') || text.includes('shield')) {
    caregiverScore += 2;
    traits.push("protective", "guardian");
  }
  if (text.includes('give') || text.includes('share') || text.includes('donate') || text.includes('volunteer')) {
    caregiverScore += 2;
    traits.push("generous", "giving");
  }

  // 👑 The Ruler - organized, responsible, leadership, authoritative
  if (text.includes('lead') || text.includes('leader') || text.includes('manage') || text.includes('direct')) {
    rulerScore += 4;
    traits.push("leadership", "managerial");
  }
  if (text.includes('organize') || text.includes('plan') || text.includes('structure') || text.includes('system')) {
    rulerScore += 3;
    traits.push("organized", "systematic");
  }
  if (text.includes('responsible') || text.includes('duty') || text.includes('accountable') || text.includes('reliable')) {
    rulerScore += 3;
    traits.push("responsible", "accountable");
  }
  if (text.includes('decision') || text.includes('choose') || text.includes('decide') || text.includes('judge')) {
    rulerScore += 2;
    traits.push("decisive", "judicious");
  }
  if (text.includes('control') || text.includes('authority') || text.includes('power') || text.includes('command')) {
    rulerScore += 2;
    traits.push("authoritative", "commanding");
  }

  // 🃏 The Jester - humorous, playful, fun-loving, entertaining
  if (text.includes('funny') || text.includes('humor') || text.includes('joke') || text.includes('laugh')) {
    jesterScore += 4;
    traits.push("humorous", "funny");
  }
  if (text.includes('fun') || text.includes('play') || text.includes('game') || text.includes('enjoy')) {
    jesterScore += 3;
    traits.push("playful", "fun-loving");
  }
  if (text.includes('party') || text.includes('celebrate') || text.includes('festive') || text.includes('social')) {
    jesterScore += 3;
    traits.push("social", "festive");
  }
  if (text.includes('entertain') || text.includes('perform') || text.includes('show') || text.includes('comedy')) {
    jesterScore += 2;
    traits.push("entertaining", "performative");
  }
  if (text.includes('light') || text.includes('bright') || text.includes('positive') || text.includes('optimistic')) {
    jesterScore += 2;
    traits.push("lighthearted", "optimistic");
  }

  // 💖 The Lover - passionate, romantic, aesthetic, sensual
  if (text.includes('love') || text.includes('romance') || text.includes('relationship') || text.includes('partner')) {
    loverScore += 4;
    traits.push("romantic", "loving");
  }
  if (text.includes('passion') || text.includes('desire') || text.includes('intense') || text.includes('fire')) {
    loverScore += 3;
    traits.push("passionate", "intense");
  }
  if (text.includes('beauty') || text.includes('beautiful') || text.includes('aesthetic') || text.includes('gorgeous')) {
    loverScore += 3;
    traits.push("appreciative", "aesthetic");
  }
  if (text.includes('sensual') || text.includes('touch') || text.includes('feel') || text.includes('intimate')) {
    loverScore += 2;
    traits.push("sensual", "tactile");
  }
  if (text.includes('harmony') || text.includes('balance') || text.includes('peace') || text.includes('calm')) {
    loverScore += 2;
    traits.push("harmonious", "balanced");
  }

  // 🦸 The Hero - brave, courageous, protective, determined
  if (text.includes('brave') || text.includes('courage') || text.includes('hero') || text.includes('bravery')) {
    heroScore += 4;
    traits.push("courageous", "brave");
  }
  if (text.includes('protect') || text.includes('defend') || text.includes('guard') || text.includes('shield')) {
    heroScore += 3;
    traits.push("protective", "defensive");
  }
  if (text.includes('strong') || text.includes('power') || text.includes('strength') || text.includes('mighty')) {
    heroScore += 3;
    traits.push("strong", "powerful");
  }
  if (text.includes('challenge') || text.includes('overcome') || text.includes('fight') || text.includes('battle')) {
    heroScore += 2;
    traits.push("determined", "resilient");
  }
  if (text.includes('save') || text.includes('rescue') || text.includes('help') || text.includes('aid')) {
    heroScore += 2;
    traits.push("rescuer", "helper");
  }

  // 👨‍💼 The Everyman - practical, relatable, down-to-earth, genuine
  if (text.includes('normal') || text.includes('average') || text.includes('regular') || text.includes('ordinary')) {
    everymanScore += 4;
    traits.push("relatable", "down-to-earth");
  }
  if (text.includes('practical') || text.includes('realistic') || text.includes('pragmatic') || text.includes('sensible')) {
    everymanScore += 3;
    traits.push("practical", "pragmatic");
  }
  if (text.includes('simple') || text.includes('easy') || text.includes('basic') || text.includes('straightforward')) {
    everymanScore += 3;
    traits.push("simple", "straightforward");
  }
  if (text.includes('honest') || text.includes('genuine') || text.includes('authentic') || text.includes('real')) {
    everymanScore += 2;
    traits.push("authentic", "genuine");
  }
  if (text.includes('work') || text.includes('job') || text.includes('career') || text.includes('profession')) {
    everymanScore += 2;
    traits.push("hardworking", "diligent");
  }

  // 🚩 The Rebel - independent, revolutionary, freedom-loving, challenging
  if (text.includes('rebel') || text.includes('revolution') || text.includes('revolutionary') || text.includes('anti')) {
    rebelScore += 4;
    traits.push("revolutionary", "rebellious");
  }
  if (text.includes('freedom') || text.includes('free') || text.includes('liberty') || text.includes('independent')) {
    rebelScore += 3;
    traits.push("freedom-loving", "independent");
  }
  if (text.includes('change') || text.includes('transform') || text.includes('reform') || text.includes('different')) {
    rebelScore += 3;
    traits.push("change-agent", "transformative");
  }
  if (text.includes('nonconform') || text.includes('unique') || text.includes('different') || text.includes('individual')) {
    rebelScore += 2;
    traits.push("nonconformist", "individualistic");
  }
  if (text.includes('radical') || text.includes('extreme') || text.includes('intense') || text.includes('strong')) {
    rebelScore += 2;
    traits.push("radical", "intense");
  }

  // 🔮 The Magician - visionary, transformative, charismatic, mystical
  if (text.includes('magic') || text.includes('mystic') || text.includes('spiritual') || text.includes('universe')) {
    magicianScore += 4;
    traits.push("mystical", "spiritual");
  }
  if (text.includes('vision') || text.includes('dream') || text.includes('future') || text.includes('prophet')) {
    magicianScore += 3;
    traits.push("visionary", "dreamer");
  }
  if (text.includes('transform') || text.includes('change') || text.includes('evolve') || text.includes('grow')) {
    magicianScore += 3;
    traits.push("transformative", "evolving");
  }
  if (text.includes('energy') || text.includes('power') || text.includes('force') || text.includes('vibration')) {
    magicianScore += 2;
    traits.push("energetic", "powerful");
  }
  if (text.includes('intuition') || text.includes('instinct') || text.includes('gut') || text.includes('feeling')) {
    magicianScore += 2;
    traits.push("intuitive", "instinctive");
  }

  // 👼 The Innocent - optimistic, trusting, pure-hearted, joyful
  if (text.includes('innocent') || text.includes('pure') || text.includes('clean') || text.includes('good')) {
    innocentScore += 4;
    traits.push("pure-hearted", "innocent");
  }
  if (text.includes('optimistic') || text.includes('positive') || text.includes('hope') || text.includes('hopeful')) {
    innocentScore += 3;
    traits.push("optimistic", "hopeful");
  }
  if (text.includes('trust') || text.includes('faith') || text.includes('believe') || text.includes('confidence')) {
    innocentScore += 3;
    traits.push("trusting", "faithful");
  }
  if (text.includes('joy') || text.includes('happy') || text.includes('delight') || text.includes('pleasure')) {
    innocentScore += 2;
    traits.push("joyful", "happy");
  }
  if (text.includes('simple') || text.includes('easy') || text.includes('pure') || text.includes('clear')) {
    innocentScore += 2;
    traits.push("simple", "clear");
  }

  // Find the highest scoring archetype
  const scores = {
    "The Creator": creatorScore,
    "The Explorer": explorerScore,
    "The Sage": sageScore,
    "The Caregiver": caregiverScore,
    "The Ruler": rulerScore,
    "The Jester": jesterScore,
    "The Lover": loverScore,
    "The Hero": heroScore,
    "The Everyman": everymanScore,
    "The Rebel": rebelScore,
    "The Magician": magicianScore,
    "The Innocent": innocentScore
  };

  let detectedArchetype = "The Explorer";
  let highestScore = 0;

  for (const [archetype, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      detectedArchetype = archetype;
    }
  }

  // Handle ties by preferring more specific archetypes
  if (highestScore === 0) {
    // If no clear archetype, use sentiment-based fallback
    if (text.includes('like') || text.includes('love') || text.includes('enjoy') || text.includes('adore')) {
      detectedArchetype = "The Enthusiast";
      traits.push("passionate", "engaged", "enthusiastic");
    } else if (text.includes('want') || text.includes('need') || text.includes('seek') || text.includes('search')) {
      detectedArchetype = "The Seeker";
      traits.push("curious", "exploring", "searching");
    } else {
      detectedArchetype = "The Everyman";
      traits.push("balanced", "adaptable", "practical");
    }
  }

  // Determine confidence level with more granular scoring
  let confidence = "low";
  if (highestScore >= 8) confidence = "very high";
  else if (highestScore >= 6) confidence = "high";
  else if (highestScore >= 4) confidence = "moderate";
  else if (highestScore >= 2) confidence = "low";
  else confidence = "initial";

  // Remove duplicates from traits and get top traits
  const uniqueTraits = Array.from(new Set(traits));
  
  // Sort traits by relevance (you could add weighting logic here)
  const topTraits = uniqueTraits.slice(0, 4);

  return {
    archetype: detectedArchetype,
    confidence: confidence,
    traits: topTraits,
    scores: scores // Return all scores for debugging and transparency
  };
}

function getArchetypeRecommendations(archetype: string): { movies: string[], books: string[], activities: string[], music: string[] } {
  const recommendations: { [key: string]: { movies: string[], books: string[], activities: string[], music: string[] } } = {
    "The Creator": {
      movies: ["Amadeus", "Frida", "Shakespeare in Love", "The Red Shoes"],
      books: ["The Artist's Way", "Steal Like an Artist", "Big Magic"],
      activities: ["Painting workshops", "Creative writing", "Visiting art galleries", "Learning an instrument"],
      music: ["David Bowie", "Experimental genres", "Art rock", "Classical compositions"]
    },
    "The Explorer": {
      movies: ["Into the Wild", "The Secret Life of Walter Mitty", "Wild", "The Beach"],
      books: ["Wild", "The Alchemist", "Into the Wild", "Travels with Charley"],
      activities: ["Hiking", "Travel photography", "Trying new cuisines", "Adventure sports"],
      music: ["World music", "Folk", "Ambient nature sounds", "Adventure film scores"]
    },
    "The Sage": {
      movies: ["The Matrix", "Good Will Hunting", "A Beautiful Mind", "The Imitation Game"],
      books: ["Meditations", "Sapiens", "Thinking, Fast and Slow", "The Power of Now"],
      activities: ["Meditation", "Philosophical discussions", "Research projects", "Reading groups"],
      music: ["Classical", "Instrumental", "Thought-provoking lyrics", "Ambient study music"]
    },
    "The Caregiver": {
      movies: ["Pay It Forward", "The Blind Side", "Steel Magnolias", "Patch Adams"],
      books: ["Tuesdays with Morrie", "The Five Love Languages", "The Giving Tree", "Chicken Soup for the Soul"],
      activities: ["Volunteering", "Mentoring", "Community service", "Caregiving"],
      music: ["Uplifting", "Emotional ballads", "Connection-focused", "Inspirational"]
    },
    "The Ruler": {
      movies: ["The Godfather", "The Social Network", "Lincoln", "The Queen"],
      books: ["The 7 Habits of Highly Effective People", "Leaders Eat Last", "The Prince", "Good to Great"],
      activities: ["Strategic games", "Project planning", "Team sports", "Public speaking"],
      music: ["Powerful anthems", "Structured classical", "Motivational", "Epic film scores"]
    },
    "The Jester": {
      movies: ["The Grand Budapest Hotel", "Superbad", "Anchorman", "Monty Python films"],
      books: ["Bossypants", "Yes Please", "The Hitchhiker's Guide to the Galaxy", "Humorous memoirs"],
      activities: ["Improv classes", "Comedy shows", "Social games", "Party planning"],
      music: ["Upbeat pop", "Comedy music", "Playful genres", "Dance music"]
    },
    "The Lover": {
      movies: ["The Notebook", "Casablanca", "Eternal Sunshine", "Before Sunrise"],
      books: ["Pride and Prejudice", "The Time Traveler's Wife", "Call Me by Your Name", "Romantic poetry"],
      activities: ["Cooking for loved ones", "Dancing", "Spa days", "Romantic getaways"],
      music: ["Love songs", "Sensual jazz", "Romantic classical", "R&B"]
    },
    "The Hero": {
      movies: ["Braveheart", "Gladiator", "Wonder Woman", "The Dark Knight"],
      books: ["The Hero with a Thousand Faces", "Man's Search for Meaning", "The Odyssey", "Biographies of leaders"],
      activities: ["Martial arts", "Extreme sports", "Rescue training", "Leadership workshops"],
      music: ["Epic soundtracks", "Rock anthems", "Motivational", "Power metal"]
    },
    "The Everyman": {
      movies: ["Forrest Gump", "The Shawshank Redemption", "Groundhog Day", "It's a Wonderful Life"],
      books: ["To Kill a Mockingbird", "The Catcher in the Rye", "Normal People", "Realistic fiction"],
      activities: ["Social gatherings", "Team sports", "Community events", "Casual hobbies"],
      music: ["Popular hits", "Folk rock", "Relatable lyrics", "Mainstream genres"]
    },
    "The Rebel": {
      movies: ["Fight Club", "V for Vendetta", "The Matrix", "Dead Poets Society"],
      books: ["1984", "On the Road", "The Catcher in the Rye", "Revolutionary literature"],
      activities: ["Activism", "Urban exploration", "Alternative sports", "Political discussions"],
      music: ["Punk rock", "Protest songs", "Alternative genres", "Revolutionary anthems"]
    },
    "The Magician": {
      movies: ["The Prestige", "Harry Potter series", "Doctor Strange", "Practical Magic"],
      books: ["The Night Circus", "Jonathan Strange & Mr Norrell", "The Magicians", "Mythology"],
      activities: ["Magic tricks", "Spiritual practices", "Vision boarding", "Creative visualization"],
      music: ["Mystical", "Electronic", "Fantasy soundtracks", "Transcendental"]
    },
    "The Seeker": {
      movies: ["The Truman Show", "Eat Pray Love", "The Darjeeling Limited", "Into the Wild"],
      books: ["The Alchemist", "Siddhartha", "The Celestine Prophecy", "Self-discovery literature"],
      activities: ["Travel", "Meditation retreats", "Trying new experiences", "Personal growth workshops"],
      music: ["World fusion", "New age", "Journey-themed", "Eclectic mixes"]
    }
  };

  return recommendations[archetype] || recommendations["The Explorer"];
}

function isValidAnswer(answer: string): boolean {
  if (!answer || answer.trim().length < 3) return false;
  
  // Skip common filler words or non-answers
  const invalidPatterns = [
    'i don\'t know', 'idk', 'not sure', 'maybe', 'perhaps',
    'repeat', 'again', 'what', 'huh', 'sorry', 'pardon'
  ];
  
  const lowerAnswer = answer.toLowerCase().trim();
  return !invalidPatterns.some(pattern => lowerAnswer.includes(pattern));
}

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
}

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 3000, // Reduced for faster testing
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  ollamaModels?: string[];
  temperature: number;
  currentModel: string;
  top_k: number;
  lastLLMReply?: string;
  questions?: string[];
  questionIndex?: number;
  userProfile?: any;
  detectedArchetype?: string;
  quickAnalysisDone?: boolean;
  userStatement?: string;
  detectedTraits?: string[];
  detectedFromStatement?: boolean;
  analysisResult?: any;
}

interface DMContext {
  count: number;
  spstRef: AnyActorRef;
  informationState: { latestMove: string };
  lastResult: string;
  messages: Message[];
}

async function fetchLLM(
    messages: Message[], 
    model: string = "llama3.1", // "mistral" // n this case it should be changed also in the other 2 sections
    temperature: number = 0.7,
    top_k: number = 100
): Promise<string> {
  try {
    console.log(`Calling LLM with model: ${model}, temperature: ${temperature}, top_k: ${top_k}`);

    // Clean and filter messages to remove duplicates and fix structure
    const cleanedMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content[0]?.utterance || "Unknown input"
        };
      }
      return msg;
    }).filter(msg => msg.content.trim() !== "");

    console.log("Cleaned messages:", cleanedMessages);

    const body = {
      model: model,
      stream: false,
      messages: cleanedMessages,
      options: {
        temperature: temperature,
        top_p: 0.9,
        top_k: top_k,
        num_ctx: 4096,
        num_predict: 512,
        repeat_penalty: 1.1,
        seed: 42,
        stop: [
          // Less aggressive stop patterns
          "<|start_header_id|>",
          "<|end_header_id|>",
          "###",
          "User:",
          "user:",
          "Human:",
          "human:"
          // Removed "\n\n" as it can cut off lists too early
        ],
        num_gpu: 1
      }
    };

    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HTTP error details:", errorText);
      
      if (response.status === 400) {
        throw new Error(`Bad request - check message format: ${errorText}`);
      } else if (response.status === 404) {
        throw new Error(`Model '${model}' not found. Install with: ollama pull ${model}`);
      }
      
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    console.log("Full API response:", data);

  
    if (data.message && data.message.content !== undefined) {
      let reply = data.message.content.trim();
      
      // Handle empty responses
      if (!reply) {
        console.warn("LLM returned empty response, using fallback");
        
        // Generate context-aware fallback
        const lastUserMessage = cleanedMessages.filter(m => m.role === 'user').pop()?.content || "";
        const hasPersonalityResults = cleanedMessages.some(m => 
          m.role === 'system' && m.content.includes('archetype')
        );
        
        if (hasPersonalityResults) {
          reply = "That's fascinating! Your personality results show unique patterns. What are your thoughts on these insights?";
        } else if (lastUserMessage.toLowerCase().includes('enjoy') || lastUserMessage.toLowerCase().includes('people')) {
          reply = "It's wonderful that you enjoy social connections! How do these interactions shape your perspective?";
        } else {
          reply = "I'd love to hear more about your thoughts on this. What stands out to you the most?";
        }
      }
      
      // Clean the response
      reply = reply.replace(/<\|start_header_id\|>/g, '');
      reply = reply.replace(/<\|end_header_id\|>/g, '');
      reply = reply.replace(/<\|.*?\|>/g, '');
      reply = reply.trim();
      
      console.log("Extracted LLM reply:", reply);
      return reply;
    } else {
      console.error("Unexpected response format:", data);
      
      // Return a context-aware fallback
      const hasPersonalityResults = cleanedMessages.some(m => 
        m.role === 'system' && m.content.includes('archetype')
      );
      
      if (hasPersonalityResults) {
        return "Your personality analysis reveals some fascinating insights! What are your initial reactions to discovering your archetype?";
      }
      
      return "I'm having some technical difficulties, but I'm really interested in continuing our conversation. What would you like to explore next?";
    }

  } catch (error) {
    console.error("fetchLLM failed:", error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return "I cannot connect to the AI service right now. Please make sure Ollama is running with 'ollama serve'.";
    }
    
    if (error instanceof Error && error.message.includes('model not found')) {
      return `The AI model '${model}' is not available. Please install it with 'ollama pull ${model}'.`;
    }
    
    return "I apologize for the technical issue. Let's continue our conversation - what would you like to talk about?";
  }
}

// 🚪 PRIORITY 1: Exit commands  
// const isStopCommand → OPTIONAL. It could be defined.

// 🔙 PRIORITY 2: Restart requests
// const isRestartCommand → OPTIONAL. It could be defined.

// 🎯 PRIORITY 3: Recommendation requests
const isRecommendationRequest = ({ context, event }: any) => {
  let utterance = "";
  if (event && typeof event === 'object') {
    if (Array.isArray((event as any).value)) {
      utterance = (event as any).value[0]?.utterance || "";
    }
  }
  utterance = utterance.toLowerCase().trim();
  
  const recommendationWords = [
    'recommendation', 'recommend', 'suggest', 'what should', 
    'what to watch', 'what to read', 'what to listen', 
    'tell me about', 'give me', 'show me'
  ];
  
  const recommendationPhrases = [
    'can you recommend', 'could you suggest', 'what do you recommend',
    'any recommendations', 'suggest some', 'recommend some'
  ];
  
  const hasRecommendationWord = recommendationWords.some(word => utterance.includes(word));
  const hasRecommendationPhrase = recommendationPhrases.some(phrase => utterance.includes(phrase));
  
  return hasRecommendationWord || hasRecommendationPhrase;
};

// 💬 PRIORITY 4: Personal info with archetype questions (ONLY when answerCount = 0)
const isPersonalInfoWithArchetypeQuestion = ({ context, event }: any) => {
  let utterance = "";
  if (event && typeof event === 'object') {
    if (Array.isArray((event as any).value)) {
      utterance = (event as any).value[0]?.utterance || "";
    }
  }
  utterance = utterance.toLowerCase().trim();
  
  const archetypeQuestionWords = [
    'which archetype', 'what archetype', 'my archetype', 'archetype am i',
    'i want to know my archetype', 'tell me my archetype', 'what is my archetype' // Added these
  ];
  const personalInfoWords = ['i like', 'i love', 'i enjoy', 'i am', 'i feel', 'my favorite', 'i prefer'];
  
  const hasArchetypeQuestion = archetypeQuestionWords.some(phrase => utterance.includes(phrase));
  const hasPersonalInfo = personalInfoWords.some(phrase => utterance.includes(phrase));
  
  console.log("🔍 DEBUG isPersonalInfoWithArchetypeQuestion:", {
    utterance,
    hasArchetypeQuestion,
    hasPersonalInfo,
    shouldTrigger: hasArchetypeQuestion && hasPersonalInfo
  });
  
  return hasArchetypeQuestion && hasPersonalInfo;
};

// 🧠 PRIORITY 5: Personal info shared (MOST IMPORTANT FOR "I like music") - ONLY when answerCount = 0
const isPersonalInfoShared = ({ context, event }: any) => {
  let utterance = "";
  if (event && typeof event === 'object') {
    if (Array.isArray((event as any).value)) {
      utterance = (event as any).value[0]?.utterance || "";
    }
  }
  utterance = utterance.toLowerCase().trim();
  
  const personalInfoWords = [
    'i like', 'i love', 'i enjoy', 'i am', 'i feel', 
    'my favorite', 'i prefer', 'i hate', 'i dislike',
    'i\'m into', 'i\'m interested in', 'i\'m passionate about',
    'i adore', 'i appreciate', 'i value', 'i care about'
  ];
  
  const hasPersonalInfo = personalInfoWords.some(phrase => utterance.includes(phrase));
  
  // Also check for common interests/hobbies
  const interestWords = [
    'music', 'movies', 'books', 'reading', 'cinema', 'art',
    'sports', 'travel', 'food', 'cooking', 'gaming', 'hiking',
    'photography', 'dancing', 'singing', 'writing', 'painting'
  ];
  
  const hasInterests = interestWords.some(word => utterance.includes(word));
  
  // Trigger if it has personal info OR mentions specific interests with personal context
  const shouldTrigger = (hasPersonalInfo && utterance.length > 10) || 
                       (hasInterests && utterance.includes('i ') && utterance.length > 15);
  
  console.log("🔍 DEBUG isPersonalInfoShared:", {
    utterance,
    hasPersonalInfo,
    hasInterests,
    utteranceLength: utterance.length,
    shouldTrigger
  });
  
  return shouldTrigger;
};

// 🕺 PRIORITY 6: Archetype list requests
const isArchetypeListRequest = ({ context, event }: any) => {
  let utterance = "";
  if (event && typeof event === 'object') {
    if (Array.isArray((event as any).value)) {
      utterance = (event as any).value[0]?.utterance || "";
    }
  }
  utterance = utterance.toLowerCase().trim();
  const archetypeKeywords = [
    'list of archetypes', 
    'what are the archetypes', 
    'tell me the archetypes', 
    'archetypes list',
    'tell me all the archetypes',  // Added this one for your specific case
    'all the archetypes'           // Added this one too
  ];
  return archetypeKeywords.some(phrase => utterance.includes(phrase));
};

// 🔮 PRIORITY 7:  Handle requests for archetype-specific recommendations
const extractCategory = (utterance: string): string | undefined => {
  utterance = utterance.toLowerCase();
  
  if (utterance.includes('rock music') || utterance.includes('rock songs') || utterance.includes('rock band')) {
    return 'rock music';
  } else if (utterance.includes('music') || utterance.includes('songs') || utterance.includes('band')) {
    return 'music';
  } else if (utterance.includes('movie') || utterance.includes('film') || utterance.includes('watch') || utterance.includes('cinema')) {
    return 'movies'; // Changed from 'movie' to 'movies' for consistency
  } else if (utterance.includes('book') || utterance.includes('read') || utterance.includes('novel')) {
    return 'books';
  } else if (utterance.includes('activity') || utterance.includes('hobby') || utterance.includes('do')) {
    return 'activities';
  }
  
  return undefined;
};

// ✅ PRIORITY 8: Normal input LAST (fallback) - This now captures "I love/I like" after first interaction
// const isNormalInput → OPTIONAL. It could be defined.


// 🗣️ DM MACHINE
const dmMachine = setup({
  types: {
    context: {} as MyDMContext,
    events: {} as DMEvents,
  },

  // 🥊 ACTIONS
  actions: {
    sst_prepare: ({ context }) => context.spstRef.send({ type: "PREPARE" }),

    sst_listen: ({ context }) => context.spstRef.send({ type: "LISTEN" }),

    appendUserMessage: assign({
      messages: ({ context, event }) => [
        ...context.messages,
        { role: "user", content: (event as any).value[0].utterance }
      ]
    }),

    appendAssistantMessage: assign({
      messages: ({ context, event }) => [
        ...context.messages,
        { role: "assistant", content: (event as any).output }
      ],
      lastLLMReply: ({ context, event }) => {
        const output = (event as any).output;
        // Only update if it's not a no-input placeholder or error
        if (
          output &&
          !output.includes("silent") &&
          !output.includes("Mercury retrograde")
        ) {
          return output;
        }
        return context.lastLLMReply; // keep previous
      }
    }),

    speakLastMessage: ({ context }) => {
      const message = context.lastLLMReply || context.messages[context.messages.length - 1]?.content || "";
      console.log("🔊 SPEAKING DEBUG:", {
        hasLastLLMReply: !!context.lastLLMReply,
        lastLLMReply: context.lastLLMReply,
        lastMessageContent: context.messages[context.messages.length - 1]?.content,
        finalMessage: message
      });
      
      if (message) {
        console.log("🔊 Speaking:", message);
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: message },
        });
      } else {
        console.error("🔊 No message to speak!");
      }
    },

    incrementNoInputCounter: assign({
      noinputCounter: ({ context }) => {
        const newCount = (context.noinputCounter || 0) + 1;
        console.log("NOINPUT counter:", newCount);
        return newCount;
      }
    }),

    resetNoInputCounter: assign({
      noinputCounter: 0
    }),

    // ✅ PRIORITY 8: Normal input LAST (fallback) - This now captures "I love/I like" after first interaction
    recordPsychAnswer: assign({
      messages: ({ context, event }) => {
        // Check if the last message is already the same user message to avoid duplicates
        const lastMessage = context.messages[context.messages.length - 1];
        const newAnswer = (event as any).value[0]?.utterance || "";
    
        if (lastMessage && lastMessage.role === "user" && lastMessage.content === newAnswer) {
          return context.messages;
        }
        
        const answer = newAnswer;
        const qidx = (context.questionIndex || 1) - 1;
        const q = context.questions ? context.questions[qidx] : "Q";
        
        // Only count valid answers - but don't update userProfile here
        if (isValidAnswer(answer)) {
          console.log("✅ Recorded valid answer:", { q, a: answer });
          console.log("📊 Total valid answers now:", (context.userProfile?.validAnswers || 0) + 1);
        } else {
          console.log("⏭️ Skipped invalid/short answer:", answer);
        }
        
        return [...context.messages, { role: "user", content: answer }];
      },
      userProfile: ({ context, event }) => {
        const newAnswer = (event as any).value[0]?.utterance || "";
        const qidx = (context.questionIndex || 1) - 1;
        const q = context.questions ? context.questions[qidx] : "Q";
        
        const currentUserProfile = context.userProfile || { answers: [], interactionCount: 0, validAnswers: 0 };
        
        // Only update if it's a valid answer
        if (isValidAnswer(newAnswer)) {
          return {
            ...currentUserProfile,
            answers: [...currentUserProfile.answers, { q, a: newAnswer }],
            interactionCount: currentUserProfile.interactionCount + 1,
            validAnswers: (currentUserProfile.validAnswers || 0) + 1
          };
        }
        return currentUserProfile;
      }
    }),
    
    cleanLLMResponse: assign({
      lastLLMReply: ({ context, event }) => {
        let reply = event.output || "";
        
        // Clean special tokens that might have slipped through
        reply = reply.replace(/<\|start_header_id\|>/g, '');
        reply = reply.replace(/<\|end_header_id\|>/g, '');
        reply = reply.replace(/<\|.*?\|>/g, '');
        reply = reply.trim();
        
        // If empty after cleaning, use a fallback
        if (!reply) {
          const currentIndex = context.questionIndex || 0;
          if (currentIndex < context.questions.length) {
            reply = context.questions[currentIndex];
          } else {
            reply = "What would you like to talk about next?";
          }
        }
        
        return reply;
      }
    }),

    restartConversation: assign({
      messages: [{ role: "system", content: "You are a friendly chatbot. Keep responses brief." }],
      questionIndex: 0,
      lastLLMReply: "",
      noinputCounter: 0,
      temperature: 0.7,
      currentModel: "llama3.1", 
      top_k: 100,
      userProfile: { 
        answers: [], 
        archetype: undefined, 
        interactionCount: 0,
        validAnswers: 0 
      },
      detectedArchetype: undefined,
      quickAnalysisDone: false,
      userStatement: "",
      detectedTraits: [],
      detectedFromStatement: false
    }),

    sayGoodbye: assign({
      messages: ({ context }) => [
        ...context.messages,
        { role: "assistant", content: "Goodbye! It was nice talking to you." }
      ],
      noinputCounter: 0,
      lastLLMReply: "Goodbye! It was nice talking to you."
    }),
    
    provideArchetypeList: assign({
      lastLLMReply: `Sure! Here are the main personality archetypes: 1. **The Caregiver** - Compassionate, nurturing, protective 2. **The Creator** - Imaginative, innovative, artistic 3. **The Explorer** - Adventurous, curious, independent 4. **The Hero** - Courageous, determined, strong-willed 5. **The Innocent** - Optimistic, trusting, pure-hearted 6. **The Jester** - Playful, humorous, entertaining 7. **The Lover** - Passionate, intimate, appreciative 8. **The Magician** - Visionary, transformative, charismatic 9. **The Everyman** - Practical, relatable, grounded 10. **The Ruler** - Authoritative, responsible, organized 11. **The Sage** - Wise, knowledgeable, thoughtful 12. **The Rebel** - Revolutionary, challenging, non-conformist. Which of these resonates most with you?`
    }),

    provideRecommendations: assign({
      lastLLMReply: ({ context }) => {
        // Use detected archetype or default to Explorer
        const archetype = context.detectedArchetype || "The Explorer";
        const recommendations = getArchetypeRecommendations(archetype);
        
        return `As a ${archetype}, here are personalized recommendations for you: Books: ${recommendations.books.slice(0, 3).join(', ')} Music: ${recommendations.music.slice(0, 3).join(', ')} Movies: ${recommendations.movies.slice(0, 3).join(', ')} Activities: ${recommendations.activities.slice(0, 3).join(', ')} Would you like more specific recommendations in any category, or shall we continue exploring your personality?`;
      }
    }),

    continuePersonalityExploration: assign({
      lastLLMReply: ({ context }) => {
        const nextIndex = context.questionIndex || 0;
        const nextQuestion = context.questions?.[nextIndex] || "Tell me more about what makes you feel truly alive and engaged?";
        
        return `Great! Let's continue exploring your personality. ${nextQuestion}`;
      },
      questionIndex: ({ context }) => (context.questionIndex || 0) + 1
    }),

    provideLLMRecommendations: assign({
      lastLLMReply: ({ context, event }) => {
        let llmResponse = event.output || "";
        
        console.log("🔍 DEBUG provideLLMRecommendations:", {
          llmResponse,
          length: llmResponse.length,
          hasMultipleLines: llmResponse.split('\n').length,
          lines: llmResponse.split('\n')
        });
        
        // IMPROVED content detection - accept single recommendations too
        const hasUsefulContent = llmResponse && 
                                llmResponse.length > 30 && 
                                (llmResponse.includes('1.') || 
                                 llmResponse.includes('2.') || 
                                 llmResponse.includes('3.') ||
                                 llmResponse.includes('recommend') ||
                                 llmResponse.includes('suggest') ||
                                 // NEW: Accept single recommendations without numbers
                                 (llmResponse.includes(' by ') && llmResponse.length > 100) || // Book/movie with author
                                 llmResponse.includes(' - ') || // Item with description
                                 llmResponse.includes('**') // Bold formatting for titles
                                );
        
        if (hasUsefulContent) {
          // If it already ends with a question, don't add another one
          if (llmResponse.trim().endsWith('?')) {
            return llmResponse;
          }
          
          // Check if this looks like a single recommendation (no numbered lists)
          const hasNumberedList = llmResponse.includes('1.') || llmResponse.includes('2.') || llmResponse.includes('3.');
          
          if (!hasNumberedList) {
            // Single recommendation - add appropriate follow-up
            return llmResponse + "\n\nWould you like me to recommend more books, or shall we explore your personality further?";
          } else {
            // Multiple recommendations - use original follow-up
            return llmResponse + "\n\nWould you like more specific recommendations, or shall we explore your personality further?";
          }
        }
        
        // Category-specific fallbacks
        const lastUserMessage = context.messages[context.messages.length - 1]?.content || "";
        const category = extractCategory(lastUserMessage);
        
        if (category === 'rock music') {
          return `Since you asked about rock music, here are some great recommendations:
    
          🎸 Classic Rock:
          1. Led Zeppelin - "Stairway to Heaven" (epic progressive rock)
          2. The Rolling Stones - "Paint It Black" (iconic rock with sitar)
          3. Queen - "Bohemian Rhapsody" (operatic rock masterpiece)
          
          🎸 Modern Rock:  
          1. Arctic Monkeys - "Do I Wanna Know?" (indie rock with great bassline)
          2. The Black Keys - "Lonely Boy" (blues-infused garage rock)
          3. Foo Fighters - "Everlong" (90s alternative rock classic)
          
          What era or style of rock music interests you most?`;
              } else if (category === 'books') {
                return `Here are some book recommendations you might enjoy:
          
          1. "The Night Circus" by Erin Morgenstern - A magical competition between illusionists in a mysterious circus
          2. "Project Hail Mary" by Andy Weir - A thrilling sci-fi adventure about survival and friendship  
          3. "Where the Crawdads Sing" by Delia Owens - A beautiful coming-of-age mystery set in the marshes
          
          What genre of books do you typically enjoy most?`;
              } else if (category) {
                return `I'd love to recommend some ${category} for you! To give you more personalized suggestions, what do you usually enjoy in that category?`;
              } else {
                return `I'd love to recommend something for you! Here are some diverse options:
          
          📚 Books: "The Alchemist" by Paulo Coelho, "To Kill a Mockingbird" by Harper Lee
          🎵 Music: Classical piano, Indie folk, Jazz standards  
          🎬 Movies: "The Shawshank Redemption", "Spirited Away", "Inception"
          
          What type of recommendations are you most interested in?`;
        }
      }
    }),

    provideArchetypeSpecificRecommendations: assign({
      lastLLMReply: ({ context }) => {
        const archetype = context.userProfile?.archetype || "The Explorer";
        const recommendations = getArchetypeRecommendations(archetype);
        
        const bookRecs = recommendations.books.slice(0, 2).join(', ');
        const movieRecs = recommendations.movies.slice(0, 2).join(', ');
        const activityRecs = recommendations.activities.slice(0, 2).join(', ');
        const musicRecs = recommendations.music.slice(0, 2).join(', ');
        
        return `As a ${archetype}, here are personalized recommendations for you:
      📚 Books: ${bookRecs}
      🎬 Movies: ${movieRecs}
      🎵 Music: ${musicRecs}
      ⚡ Activities: ${activityRecs}
      
      Would you like more specific recommendations in any particular category?`;
      }
    }),
    
        
  },

   // 🎭 ACTORS
  actors: {

    chatCompletion: fromPromise(async ({ input }) => {
      return await fetchLLM(
        input.messages,
        input.model,
        input.temperature,
        input.top_k
      );
    }),

    analyzeMBTI: fromPromise(async ({ input }) => {
      try {
        const { answers, userText } = input;
        
        // Use your psychology functions directly
        const psychologyResult = detectArchetypeFromStatement(userText);
        const mbtiType = archetypeToMBTI(psychologyResult.archetype);
        
        return {
          archetype: psychologyResult.archetype,
          type: mbtiType,
          confidence: psychologyResult.confidence === "very high" ? 0.85 : 
                     psychologyResult.confidence === "high" ? 0.75 : 0.6,
          traits: psychologyResult.traits,
          description: `Your personality aligns with the ${psychologyResult.archetype} archetype.`,
          source: "psychology-analysis"
        };
        
      } catch (error) {
        console.error("Analysis failed:", error);
        // Final fallback using psychology
        const userText = answers.map((a: any) => a.a).join(' ');
        const psychologyResult = detectArchetypeFromStatement(userText);
        
        return {
          archetype: psychologyResult.archetype,
          type: "INFP",
          confidence: 0.6,
          traits: psychologyResult.traits,
          description: `Based on our conversation, you show ${psychologyResult.archetype} characteristics.`,
          source: "fallback-psychology"
        };
      }
    }),

    generateGeneralRecommendations: fromPromise(async ({ input }: { input: { category?: string, utterance?: string } }) => {
      const { category, utterance = "" } = input;
      
      // Check if user specifically asks for just one item
      const userWantsJustOne = utterance.toLowerCase().includes('just one') || 
                              utterance.toLowerCase().includes('only one') ||
                              utterance.toLowerCase().includes('one movie') ||
                              utterance.toLowerCase().includes('one book') ||
                              utterance.toLowerCase().includes('single');
      
      let prompt = "";
      if (category === 'rock music') {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific rock music recommendation with actual band name and song/album example. Be concise."`;
        } else {
          prompt = `Provide 2-3 rock music recommendations with actual band names and song/album examples. Include a mix of classic and modern rock. Format as a simple numbered list with brief descriptions.`;
        }
      } else if (category === 'music') {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific music recommendation with actual artist name and song/album example. Be concise.`;
        } else {
          prompt = `Provide 2-3 specific music recommendations across different genres with actual artist names and song/album examples. Format as a simple numbered list with brief descriptions.`;
        }
      } else if (category === 'books') {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific book recommendation with actual title and author. Be concise.`;
        } else {
          prompt = `Provide 2-3 specific book recommendations with actual titles and authors. Include brief descriptions of what makes each book special. Format as a simple numbered list.`;
        }
      } else if (category === 'movies') {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific movie recommendation with actual title. Be concise.`;
        } else {
          prompt = `Provide 2-3 specific movie recommendations with actual titles/names and brief descriptions. Be concrete and mention specific examples. Format as a simple numbered list.`;
        }
      } else if (category) {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific ${category} recommendation with actual title/name. Be very specific and detailed about why this one recommendation is perfect.`;
        } else {
          prompt = `Provide 2-3 specific ${category} recommendations with actual titles/names and brief descriptions. Be concrete and mention specific examples. Format as a simple numbered list.`;
        }
      } else {
        if (userWantsJustOne) {
          prompt = `Provide ONE specific recommendation for any category. Choose the most impactful recommendation and explain in detail why it's special.`;
        } else {
          prompt = `Provide 2 specific recommendations each for books, music, movies, and activities. Be concrete with actual titles and brief descriptions. Format as simple lists with numbers.`;
        }
      }
    
      const messages = [
        { 
          role: "system", 
          content: `You are a creative recommendation assistant. Provide SPECIFIC recommendations with actual titles and brief descriptions. 
          NEVER use generic phrases like "Here are some recommendations" or section headers. 
          ALWAYS provide concrete examples that people can actually try. 
          ${userWantsJustOne ? 'Provide ONLY ONE recommendation as requested, with detailed explanation.' : 'Format as simple lists with numbers.'}`
        },
        { role: "user", content: prompt }
      ];
      
      return await fetchLLM(messages, "llama3.1", 0.8, 100);
    }),
    
    analyzeGeneralFromStatement: fromPromise(async ({ input }: { input: { utterance: string, contextMessages?: Message[] } }) => {
      const { utterance, contextMessages = [] } = input;
      
      console.log("🎯 Analyzing statement for archetype:", { 
        utterance
      });
      
      // First, always do local detection as backup
      const localDetection = detectArchetypeFromStatement(utterance);
      console.log("🧪 Local archetype detection:", localDetection);
      
      try {
        const llmResponse = await fetchLLM([
          { 
            role: "system", 
            content: `Analyze this statement for personality archetype: "${utterance}"
            Respond with JUST the analysis in this format:
            "Based on your interests, I detect you're the [Archetype Name] archetype! Key traits: [trait1, trait2, trait3]. Would you like recommendations or to continue exploring?"`
          }
        ], "llama3.1", 0.7, 100);
        
        console.log("🔍 Raw LLM archetype response:", llmResponse);
        
        if (!llmResponse || llmResponse.trim() === "") {
          throw new Error("Empty LLM response");
        }
        
        return {
          response: llmResponse,
          archetype: localDetection.archetype, // Use local as fallback
          traits: localDetection.traits,
          confidence: localDetection.confidence,
          reasoning: "LLM analysis with local backup"
        };
        
      } catch (error) {
        console.error("❌ Archetype analysis failed:", error);
        
        // Use local detection with proper formatting
        const fallbackResponse = `Based on you saying "${utterance}", I detect you might be the "${localDetection.archetype}" archetype with ${localDetection.confidence} confidence! Key traits: ${localDetection.traits.join(', ')}. Would you like recommendations or to continue exploring?`;
        
        return {
          response: fallbackResponse,
          archetype: localDetection.archetype,
          traits: localDetection.traits,
          confidence: localDetection.confidence,
          reasoning: "Local fallback analysis"
        };
      }
    }),
    
  }
    
// 🤖 MACHINE
}).createMachine({
  id: "DM",
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    informationState: { latestMove: "ping" },
    lastResult: "",
    lastLLMReply: "",
    messages: [{ 
      role:"system", 
      content: `You are a personality analysis assistant. Your main goal is to ask psychology questions to understand the user's personality and eventually determine their archetype.
      
      IMPORTANT RULES:
      1. When the user answers your psychology questions, simply acknowledge their answer and ask the next question
      2. ONLY provide recommendations if the user explicitly asks for them
      3. Keep responses brief and conversational
      4. Always end with a clear psychology question
      5. Never use special tokens, formatting, or markdown
      
      Your primary focus is asking the psychology questions, not making recommendations.`
    }],
    noinputCounter: 0,
    temperature: 0.7,
    currentModel: "llama3.1",
    top_k: 100,
    questions: psychQuestions,
    questionIndex: 0,
    userProfile: { 
      answers: [], 
      archetype: undefined, 
      interactionCount: 0,
      validAnswers: 0
    },
    detectedArchetype: undefined,
    quickAnalysisDone: false,
    userStatement: "",
    detectedTraits: [],
    detectedFromStatement: false
  }),

  initial: "Prepare",
  states: {
    Prepare: {
      entry: "sst_prepare",
      on: {
        ASRTTS_READY: "Idle",
      },
    },
    Idle: {
      description: "Waiting for user to click button to start conversation",
      on: {
        CLICK: {
          target: "Loop",
          actions: [
            assign({
              messages: ({ context }) => [
                ...context.messages,
                { role: "assistant", content: "hi, tell me what you love and I will guess who you are. Or I will make you questions." }
              ]
            }),
            assign({
              lastLLMReply: "hi, tell me what you love and I will guess who you are. Or I will make you questions."
            })
          ]
        },
      }
    },
    Loop: {
      initial: "Speaking",
      states: {
        Speaking: {
          entry: [
            ({ context }) => console.log("🎬 ENTERING Speaking state"),
            "speakLastMessage"
          ],
          on: {
            SPEAK_COMPLETE: [
              {
                // If we just completed archetype analysis, go to choice handler
                guard: ({ context }) => {
                  const hasDetectedArchetype = context.detectedArchetype && context.quickAnalysisDone;
                  console.log("🔍 Speaking→SPEAK_COMPLETE guard check:", {
                    detectedArchetype: context.detectedArchetype,
                    quickAnalysisDone: context.quickAnalysisDone,
                    hasDetectedArchetype
                  });
                  return hasDetectedArchetype;
                },
                target: "HandleArchetypeChoice",
                actions: [
                  assign({
                    quickAnalysisDone: false // Reset for next time
                  })
                ]
              },
              {
                // Default behavior
                target: "Ask"
              }
            ],
            LISTEN_COMPLETE: "Ask",
          }
        },

        Ask: {
          entry: ["sst_listen"],
          on: {
            RECOGNISED: [
              // 🚪 PRIORITY 1: Exit command
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    } else if ((event as any).value?.utterance) {
                      utterance = (event as any).value.utterance;
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  
                  // More specific quit detection - match whole words or exact phrases
                  const stopPatterns = [
                    /\bexit\b/, /\bquit\b/, /\bstop\b/, /\bgoodbye\b/, /\bbye\b/, /\bend\b/, /\bfinish\b/,
                    /^exit$/, /^quit$/, /^stop$/, /^goodbye$/, /^bye$/, /^end$/, /^finish$/
                  ];
                  
                  return stopPatterns.some(pattern => pattern.test(utterance));
                },
                actions: ["appendUserMessage"],
                target: "ConfirmQuit"
              },
              
              // 🔙 PRIORITY 2: Restart commands
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const restartWords = ['restart', 'start over', 'begin again', 'go back', 'reset', 'new test', 'redo'];
                  return restartWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter"
                ],
                target: "ConfirmRestart"
              },
            
              // 🎯 PRIORITY 3: Recommendation requests
              {
                guard: isRecommendationRequest,
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                ],
                target: "GenerateRecommendations"
              },
              
              // 💬 PRIORITY 4: Personal info with archetype questions (ONLY when answerCount = 0)
              {
                guard: ({ context, event }) => {
                  const shouldTrigger = isPersonalInfoWithArchetypeQuestion({ context, event });
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const isFirstInteraction = answerCount === 0;
                  
                  console.log("🔍 DEBUG PRIORITY 4 - Personal info with archetype question:", {
                    shouldTrigger,
                    answerCount,
                    isFirstInteraction,
                    finalTrigger: shouldTrigger && isFirstInteraction
                  });
                  
                  return shouldTrigger && isFirstInteraction;
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter", 
                  assign({
                    userProfile: ({ context }) => ({
                      ...context.userProfile,
                      quickAnalysis: true,
                      detectedFromStatement: true
                    })
                  })
                ],
                target: "AnalyzeFromStatement"
              },
              
              // 🧠 PRIORITY 5: Personal info shared (MOST IMPORTANT FOR "I like music") - ONLY when answerCount = 0
              {
                guard: ({ context, event }) => {
                  const shouldTrigger = isPersonalInfoShared({ context, event });
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const isFirstInteraction = answerCount === 0;
                  
                  console.log("🔍 DEBUG PRIORITY 5 - Personal info shared:", {
                    shouldTrigger,
                    answerCount,
                    isFirstInteraction,
                    finalTrigger: shouldTrigger && isFirstInteraction
                  });
                  
                  return shouldTrigger && isFirstInteraction;
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                ],
                target: "AnalyzeFromStatement"
              },
              
              // 🕺 PRIORITY 6: Archetype list requests
              {
                guard: isArchetypeListRequest,
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter", 
                  "provideArchetypeList"
                ],
                target: "Speaking"
              },

              // 🔮 PRIORITY 7:  Handle requests for archetype-specific recommendations
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  
                  const hasArchetypeRequest = utterance.includes('archetype') && 
                                             (utterance.includes('recommend') || utterance.includes('suggest'));
                  const hasArchetype = !!context.userProfile?.archetype;
                  
                  return hasArchetypeRequest && hasArchetype;
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                  "provideArchetypeSpecificRecommendations"
                ],
                target: "Speaking"
              },
              
              // ✅ PRIORITY 8: Normal input LAST (fallback) - This now captures "I love/I like" after first interaction
              {
                actions: [
                  "appendUserMessage", 
                  "resetNoInputCounter", 
                  "recordPsychAnswer",
                  "debugAnswers"
                ],
                target: "ChatCompletion"
              }
            ],
            ASR_NOINPUT: {
              actions: [
                "incrementNoInputCounter",
                assign({
                  temperature: ({ context }) => {
                    if (context.noinputCounter >= 2) {
                      console.log("Auto-increasing temperature to 0.9 due to silence");
                      return 1;
                    }
                    return context.temperature;
                  }
                }),
                assign(({ context }) => ({
                  messages: [
                    ...context.messages,
                    { role: "user", content: "The user was silent. Suggest a polite prompt to encourage them to speak." }
                  ]
                }))
              ],
              target: "ChatCompletion"
            },
            LISTEN_COMPLETE: "Speaking"
          }
        },

        ConfirmQuit: {
          invoke: {
            src: "chatCompletion",
            input: ({ context }) => ({
              // Use a clean, focused message for quit confirmation
              messages: [
                { 
                  role: "system", 
                  content: "The user wants to quit the conversation. Ask them a simple, direct confirmation question like 'Are you sure you want to quit?' Keep it brief and friendly." 
                },
                { 
                  role: "user", 
                  content: "I want to quit the conversation." 
                }
              ],
              model: context.currentModel,
              temperature: 0.7,
              top_k: context.top_k
            }),
            onDone: {
              actions: [
                "appendAssistantMessage",
                assign({
                  lastLLMReply: ({ event }) => {
                    let reply = event.output || "";
                    // Ensure it's a quit confirmation, not recommendations
                    if (!reply.toLowerCase().includes('sure') && !reply.toLowerCase().includes('quit')) {
                      reply = "Are you sure you want to quit our conversation?";
                    }
                    return reply;
                  }
                })
              ],
              target: "SpeakingConfirmQuit"
            },
            onError: {
              target: "Speaking",
              actions: assign({
                messages: ({ context }) => [
                  ...context.messages,
                  { role: "assistant", content: "Are you sure you want to quit?" }
                ],
                lastLLMReply: "Are you sure you want to quit?"
              })
            }
          }
        },

        SpeakingConfirmQuit: {
          entry: "speakLastMessage",
          on: {
            SPEAK_COMPLETE: {
              target: "ConfirmQuitListen"

            },
            LISTEN_COMPLETE: "ConfirmQuitListen",
          }
        },

        ConfirmQuitListen: {
          entry: ["sst_listen"],
          on: {
            RECOGNISED: [
              // User confirms quit - go to Idle state
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    } else if ((event as any).value?.utterance) {
                      utterance = (event as any).value.utterance;
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const confirmWords = ['yes', 'yeah', 'yep', 'sure', 'okay', 'confirm', 'quit', 'end'];
                  return confirmWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "restartConversation"  // This should now work with the fixed action
                ],
                target: "#DM.Idle"
              },
        
              // User wants to restart instead of quit
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    } else if ((event as any).value?.utterance) {
                      utterance = (event as any).value.utterance;
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const restartWords = ['restart', 'start over', 'begin again'];
                  return restartWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter"
                ],
                target: "ConfirmRestart"
              },
        
              // User cancels quit - continue conversation
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    } else if ((event as any).value?.utterance) {
                      utterance = (event as any).value.utterance;
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const cancelWords = ['no', 'nah', 'not now', 'cancel', 'continue'];
                  return cancelWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  assign({
                    lastLLMReply: "Great! Let's continue our conversation."
                  })
                ],
                target: "Speaking"
              },
              // Fallback for any other response - continue conversation
              {
                actions: [
                  "appendUserMessage",
                  assign({
                    lastLLMReply: "I'll assume you want to continue. Let's keep going!"
                  })
                ],
                target: "Speaking"
              }
            ],
            ASR_NOINPUT: {
              actions: assign({
                lastLLMReply: "Let's continue our conversation."
              }),
              target: "Speaking"
            },
            LISTEN_COMPLETE: "Speaking"
          }


          // POSSIBLE IMPROVEMENTS: It can be improved adding a SpeakingConfirmQuitListen like did with SpeakingConfirmQuit. So the bot will announce what is going to do: yes Answer -> Greetings and stop the code going back to Idle, no Answer -> Saying is going back with questions and the code go to ChatCompletion
        
  
        },

        ConfirmRestart: {
          invoke: {
            src: "chatCompletion",
            input: ({ context }) => ({
              messages: [
                ...context.messages,
                { 
                  role: "user", 
                  content: "User wants to restart the personality test from the beginning. Please acknowledge this request and say we're going back to the first question. Keep your response brief and friendly." 
                }
              ],
              model: context.currentModel,
              temperature: context.temperature,
              top_k: context.top_k
            }),
            onDone: {
              actions: [
                assign({
                  messages: ({ context, event }) => {
                    let reply = event.output || "";
                    
                    if (!reply || reply.trim() === "") {
                      reply = "Okay, let's start over from the beginning! Do you enjoy meeting new people or prefer staying alone?";
                    } else if (!reply.includes("?")) {
                      reply = `${reply} Do you enjoy meeting new people or prefer staying alone?`;
                    }
                    
                    return [
                      ...context.messages,
                      { role: "assistant", content: reply }
                    ];
                  },
                  lastLLMReply: ({ context, event }) => {
                    let reply = event.output || "";
                    
                    if (!reply || reply.trim() === "") {
                      reply = "Okay, let's start over from the beginning! Do you enjoy meeting new people or prefer staying alone?";
                    } else if (!reply.includes("?")) {
                      reply = `${reply} Do you enjoy meeting new people or prefer staying alone?`;
                    }
                    
                    return reply;
                  },
                  questionIndex: 0,
                  noinputCounter: 0,
                  userProfile: { 
                    answers: [], 
                    archetype: undefined, 
                    interactionCount: 0,
                    validAnswers: 0 
                  }
                })
              ],
              target: "Speaking"
            },
            onError: {
              actions: [
                assign({
                  lastLLMReply: ({ context }) => "Okay, let's restart from the beginning! " + context.questions[0],
                  questionIndex: 0,
                  noinputCounter: 0,
                  userProfile: { 
                    answers: [], 
                    archetype: undefined, 
                    interactionCount: 0,
                    validAnswers: 0 
                  },
                  messages: ({ context }) => [
                    ...context.messages,
                    { 
                      role: "assistant", 
                      content: "Okay, let's restart from the beginning! " + context.questions[0] 
                    }
                  ]
                })
              ],
              target: "Speaking"
            }
          }
        },

        ConfirmRestartListen: {
          entry: ["sst_listen"],
          on: {
            RECOGNISED: [
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const confirmWords = ['yes', 'yeah', 'yep', 'sure', 'okay'];
                  return confirmWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "restartConversation"
                ],
                target: "Speaking"
              },
              {
                actions: [
                  "appendUserMessage",
                  assign({
                    lastLLMReply: "Okay, let's continue where we left off."
                  })
                ],
                target: "Speaking"
              }
            ],
            ASR_NOINPUT: {
              actions: [
                "incrementNoInputCounter",
                assign({
                  lastLLMReply: "Let's continue our conversation."
                })
              ],
              target: "Speaking"
            }
          }
        },

        GenerateRecommendations: {
          invoke: {
            src: "generateGeneralRecommendations",
            input: ({ context, event }) => {
              let utterance = "";
              if (event && typeof event === 'object') {
                if (Array.isArray((event as any).value)) {
                  utterance = (event as any).value[0]?.utterance || "";
                }
              }
              const category = extractCategory(utterance);
              
              return { 
                category,
                utterance // Pass the full utterance to detect "just one" requests
              };
            },
            onDone: {
              actions: [
                "provideLLMRecommendations"
              ],
              target: "Speaking"
            },
            onError: {
              actions: [
                assign({
                  lastLLMReply: ({ context, event }) => {
                    let utterance = "";
                    if (event && typeof event === 'object') {
                      if (Array.isArray((event as any).value)) {
                        utterance = (event as any).value[0]?.utterance || "";
                      }
                    }
                    const category = extractCategory(utterance);
                    
                    if (category === 'rock music') {
                      return "I'd love to recommend some great rock music! Classic rock bands like Led Zeppelin, The Rolling Stones, and Queen are always fantastic. For more modern rock, you might enjoy bands like Arctic Monkeys, The Black Keys, or Foo Fighters. What specific era or style of rock music are you most interested in?";
                    } else if (category) {
                      return `I'd love to recommend some ${category} for you! To give you personalized suggestions, could you tell me what you usually enjoy in that category?`;
                    } else {
                      return "I'd love to recommend something for you! To give you personalized suggestions, could you tell me what kind of books, music, or activities you usually enjoy?";
                    }
                  }
                })
              ],
              target: "Speaking"
            }
          }
        },

        AnalyzeFromStatement: {
          invoke: {
            src: "analyzeGeneralFromStatement",
            input: ({ context, event }) => {
              let utterance = "";
              if (event && typeof event === 'object') {
                if (Array.isArray((event as any).value)) {
                  utterance = (event as any).value[0]?.utterance || "";
                }
              }
              
              return { 
                utterance,
                contextMessages: context.messages 
              };
            },
            onDone: {
              actions: [
                assign({
                  lastLLMReply: ({ context, event }) => {
                    // Store the original utterance from context/event
                    const originalUtterance = event.input?.utterance || 
                                            context.messages[context.messages.length - 1]?.content || 
                                            "your interests";
                    
                    // Ensure we have a proper response
                    let response = event.output.response;
                    if (!response || response.includes("fascinating! Your personality results show unique patterns")) {
                      // If fallback was too generic, create a better one using local detection
                      const detection = detectArchetypeFromStatement(originalUtterance);
                      response = `Based on you saying "${originalUtterance}", I detect you might be the "${detection.archetype}" archetype! Key traits: ${detection.traits.join(', ')}. Would you like recommendations or to continue exploring?`;
                    }
                    return response;
                  },
                  detectedArchetype: ({ event }) => event.output.archetype,
                  detectedTraits: ({ event }) => event.output.traits,
                  userProfile: ({ context, event }) => ({
                    ...context.userProfile,
                    quickAnalysis: true,
                    detectedFromStatement: true,
                    archetype: event.output.archetype
                  }),
                  messages: ({ context, event }) => {
                    const originalUtterance = event.input?.utterance || 
                                            context.messages[context.messages.length - 1]?.content || 
                                            "your interests";
                    
                    let response = event.output.response;
                    if (!response || response.includes("fascinating! Your personality results show unique patterns")) {
                      const detection = detectArchetypeFromStatement(originalUtterance);
                      response = `Based on you saying "${originalUtterance}", I detect you might be the "${detection.archetype}" archetype! Key traits: ${detection.traits.join(', ')}. Would you like recommendations or to continue exploring?`;
                    }
                    return [
                      ...context.messages,
                      { role: "assistant", content: response }
                    ];
                  }
                })
              ],
              target: "Speaking"
            },
            onError: {
              actions: [
                assign({
                  lastLLMReply: ({ context }) => {
                    // Get the last user message for analysis
                    const lastUserMessage = context.messages[context.messages.length - 1]?.content || "";
                    
                    // Direct local analysis as ultimate fallback
                    const detection = detectArchetypeFromStatement(lastUserMessage);
                    return `Based on you saying "${lastUserMessage}", I detect you might be the "${detection.archetype}" archetype with ${detection.confidence} confidence! Key traits I noticed: ${detection.traits.join(', ')}. Would you like me to recommend some movies, books, or activities that align with ${detection.archetype}s, or would you prefer to explore your personality further?`;
                  },
                  userProfile: ({ context }) => {
                    const lastUserMessage = context.messages[context.messages.length - 1]?.content || "";
                    const detection = detectArchetypeFromStatement(lastUserMessage);
                    
                    return {
                      ...context.userProfile,
                      quickAnalysis: true,
                      detectedFromStatement: true,
                      archetype: detection.archetype
                    };
                  }
                })
              ],
              target: "Speaking"
            }
          }
        },

        HandleArchetypeChoice: {
          entry: ["sst_listen"],
          on: {
            RECOGNISED: [
              // User wants recommendations
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const recommendationWords = ['recommendation', 'movie', 'book', 'activity', 'music', 'suggest'];
                  return recommendationWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                  "provideArchetypeRecommendations"
                ],
                target: "Speaking"
              },
              
              // User wants to explore personality further
              {
                guard: ({ context, event }) => {
                  let utterance = "";
                  if (event && typeof event === 'object') {
                    if (Array.isArray((event as any).value)) {
                      utterance = (event as any).value[0]?.utterance || "";
                    }
                  }
                  utterance = utterance.toLowerCase().trim();
                  const exploreWords = ['explore', 'more questions', 'personality', 'learn more', 'continue'];
                  return exploreWords.some(word => utterance.includes(word));
                },
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                  "continuePersonalityExploration"
                ],
                target: "Speaking"
              },
              
              // Default: assume they want recommendations
              {
                actions: [
                  "appendUserMessage",
                  "resetNoInputCounter",
                  "provideArchetypeRecommendations"
                ],
                target: "Speaking"
              }
            ],
            ASR_NOINPUT: {
              actions: [
                "incrementNoInputCounter",
                assign({
                  lastLLMReply: "Let me know if you'd like recommendations or to continue exploring your personality."
                })
              ],
              target: "Speaking"
            }
          }
        },
     
        ChatCompletion: {
          invoke: {
            src: "chatCompletion",
            input: ({ context }) => ({
              messages: context.messages,
              model: context.currentModel,
              temperature: context.temperature,
              top_k: context.top_k
            }),
            onDone: [
              {
                // PRIORITY 1: If user explicitly asks for archetype/personality/MBTI results WITH ENOUGH ANSWERS
                guard: ({ context, event }) => {
                  const lastUserMessage = context.messages[context.messages.length - 1]?.content || "";
                  const hasArchetypeRequest = lastUserMessage.toLowerCase().includes('archetype') || 
                                              lastUserMessage.toLowerCase().includes('personality') ||
                                              lastUserMessage.toLowerCase().includes('mbti') ||
                                              lastUserMessage.toLowerCase().includes('what am i') ||
                                              lastUserMessage.toLowerCase().includes('which type') ||
                                              lastUserMessage.toLowerCase().includes('tell me who i am');
                  
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const hasEnoughAnswers = answerCount >= 3; // Changed from 1 to 3
                  
                  console.log(`🔍 DEBUG Early archetype request: hasArchetypeRequest: ${hasArchetypeRequest}, answers: ${answerCount}, hasEnoughAnswers: ${hasEnoughAnswers}`);
                  
                  return hasArchetypeRequest && hasEnoughAnswers;
                },
                actions: [
                  "appendAssistantMessage",
                  "cleanLLMResponse",
                  assign({
                    lastLLMReply: ({ context }) => {
                      const answerCount = context.userProfile?.answers?.length || 0;
                      if (answerCount >= 3) {
                        return "Great! You've answered enough questions for a detailed analysis. Let me analyze your personality now!";
                      } else {
                        return `You've answered ${answerCount} question${answerCount === 1 ? '' : 's'}. Let me analyze your personality based on what you've shared so far!`;
                      }
                    }
                  })
                ],
                target: "AnalyzePersonality"
              },
              {
                // PRIORITY 2: If user asks for archetype but has NO answers or NOT ENOUGH answers
                guard: ({ context, event }) => {
                  const lastUserMessage = context.messages[context.messages.length - 1]?.content || "";
                  const hasArchetypeRequest = lastUserMessage.toLowerCase().includes('archetype') || 
                                              lastUserMessage.toLowerCase().includes('personality') ||
                                              lastUserMessage.toLowerCase().includes('mbti') ||
                                              lastUserMessage.toLowerCase().includes('what am i');
                  
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const hasNotEnoughAnswers = answerCount < 3; // Changed from 0 to 3
                  
                  return hasArchetypeRequest && hasNotEnoughAnswers;
                },
                actions: [
                  "appendAssistantMessage",
                  "cleanLLMResponse",
                  assign({
                    lastLLMReply: ({ context }) => {
                      const answerCount = context.userProfile?.answers?.length || 0;
                      const questionsNeeded = 3 - answerCount;
                      return `I'd love to tell you your archetype! But first, I need to learn a bit more about you. I need ${questionsNeeded} more answer${questionsNeeded === 1 ? '' : 's'} for a good analysis. ${context.questions[answerCount] || "Tell me more about yourself."}`;
                    },
                    questionIndex: ({ context }) => (context.questionIndex || 0) + 1
                  })
                ],
                target: "Speaking"
              },
              {
                // PRIORITY 3: If we have 3+ answers and haven't analyzed yet
                guard: ({ context }) => {
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const hasEnoughAnswers = answerCount >= 3;
                  const alreadyAnalyzed = context.userProfile?.archetype !== undefined;
                  
                  console.log(`🔍 DEBUG Auto-analysis check: ${answerCount} answers, hasEnoughAnswers: ${hasEnoughAnswers}, alreadyAnalyzed: ${alreadyAnalyzed}`);
                  
                  return hasEnoughAnswers && !alreadyAnalyzed;
                },
                actions: [
                  "appendAssistantMessage",
                  "cleanLLMResponse",
                  assign({
                    lastLLMReply: "Now that we've completed several questions, let me analyze your personality using advanced psychological assessment!"
                  })
                ],
                target: "AnalyzePersonality"
              },
              {
                // PRIORITY 4: If we still have psychology questions to ask AND don't have enough answers yet
                guard: ({ context }) => {
                  const currentIndex = context.questionIndex || 0;
                  const totalQuestions = context.questions?.length || 0;
                  const answerCount = context.userProfile?.answers?.length || 0;
                  const hasEnoughAnswers = answerCount >= 3;
                  
                  console.log(`🔍 DEBUG Continue questions: ${currentIndex}/${totalQuestions}, Answers: ${answerCount}, hasEnoughAnswers: ${hasEnoughAnswers}`);
                  
                  return currentIndex < totalQuestions && !hasEnoughAnswers;
                },
                actions: [
                  "appendAssistantMessage",
                  "cleanLLMResponse",
                  assign({
                    messages: ({ context }) => {
                      const nextIndex = context.questionIndex || 0;
                      const nextQuestion = context.questions?.[nextIndex] || "Tell me more about yourself.";
                      
                      const lastMessage = context.messages[context.messages.length - 1];
                      const llmResponse = lastMessage?.content || "";
                      
                      if (llmResponse.trim().endsWith('?')) {
                        return context.messages;
                      } else {
                        return [
                          ...context.messages,
                          { role: "assistant", content: nextQuestion }
                        ];
                      }
                    },
                    lastLLMReply: ({ context }) => {
                      const nextIndex = context.questionIndex || 0;
                      const nextQuestion = context.questions?.[nextIndex] || "Tell me more about yourself.";
                      
                      const currentReply = context.lastLLMReply || "";
                      if (currentReply.trim().endsWith('?')) {
                        return currentReply;
                      } else {
                        return `${currentReply} ${nextQuestion}`;
                      }
                    },
                    questionIndex: ({ context }) => (context.questionIndex || 0) + 1
                  })
                ],
                target: "Speaking"
              },
              {
                // PRIORITY 5: Default: continue normal conversation (this includes after analysis)
                actions: [
                  "appendAssistantMessage",
                  "cleanLLMResponse"
                ],
                target: "Speaking"
              }
            ],
            onError: {
              target: "Speaking",
              actions: assign({
                messages: ({ context }) => {
                  // After analysis, ask about the results instead of psychology questions
                  if (context.userProfile?.archetype) {
                    return [
                      ...context.messages,
                      {
                        role: "assistant",
                        content: "I'd love to hear your thoughts on the personality analysis we just discussed. What resonates with you?"
                      }
                    ];
                  } else {
                    const nextIndex = context.questionIndex || 0;
                    const nextQuestion = context.questions?.[nextIndex] || "What would you like to share?";
                    
                    return [
                      ...context.messages,
                      {
                        role: "assistant",
                        content: "I apologize for the technical issue. " + nextQuestion
                      }
                    ];
                  }
                },
                lastLLMReply: ({ context }) => {
                  if (context.userProfile?.archetype) {
                    return "I'd love to hear your thoughts on the personality analysis we just discussed. What resonates with you?";
                  } else {
                    const nextIndex = context.questionIndex || 0;
                    const nextQuestion = context.questions?.[nextIndex] || "What would you like to share?";
                    return "I apologize for the technical issue. " + nextQuestion;
                  }
                },
                questionIndex: ({ context }) => (context.questionIndex || 0) + 1
              })
            }
          }
        },
        
        AnalyzePersonality: {
          invoke: {
            src: "analyzeMBTI",
            input: ({ context }) => {
              const inputData = { 
                answers: context.userProfile?.answers || [],
                userText: context.userProfile?.answers?.map((a: any) => a.a).join(' ') || ""
              };
              console.log("🔍 AnalyzePersonality input:", inputData);
              return inputData;
            },
            onDone: {
              target: "SpeakingAnalysis",
              actions: [
                assign({
                  userProfile: ({ context, event }) => {
                    console.log("🔍 Assigning userProfile with output:", event.output);
                    const result = event.output;
                    const answerCount = context.userProfile?.answers?.length || 0;
                    
                    const archetype = result.archetype || "The Explorer";
                    const mbtiType = result.type || "INFP";
                    
                    return {
                      ...context.userProfile,
                      answers: [...(context.userProfile?.answers || [])],
                      archetype: result.archetype || "The Explorer",
                      mbtiType: result.type || "INFP",
                      analysisComplete: true,
                      analysisResult: { ...result }
                    };
                  },
                  messages: ({ context, event }) => {
                    const result = event.output;
                    const answerCount = context.userProfile?.answers?.length || 0;
                    const archetype = result.archetype || "The Explorer";
                    
                    // Get recommendations for this archetype
                    const recommendations = getArchetypeRecommendations(archetype);
                    const bookRec = recommendations.books[0] || "thought-provoking literature";
                    const movieRec = recommendations.movies[0] || "intellectual films";
                    const activityRec = recommendations.activities[0] || "learning activities";
                    
                    const revealMessage = `After analyzing our ${answerCount} questions, I discover your personality archetype is: ${archetype}! As a ${archetype}, you might enjoy "${bookRec}", "${movieRec}", or ${activityRec}. How does that resonate with you?`;
                    
                    return [
                      ...context.messages,
                      { role: "assistant", content: revealMessage }
                    ];
                  },
                  lastLLMReply: ({ context, event }) => {
                    const result = event.output;
                    const answerCount = context.userProfile?.answers?.length || 0;
                    const archetype = result.archetype || "The Explorer";
                    
                    // Get recommendations for this archetype
                    const recommendations = getArchetypeRecommendations(archetype);
                    const bookRec = recommendations.books[0] || "thought-provoking literature";
                    const movieRec = recommendations.movies[0] || "intellectual films";
                    const activityRec = recommendations.activities[0] || "learning activities";
                
                    return `Based on our ${answerCount} questions, I believe you are ${archetype}. This suggests you're naturally ${result.traits?.join(', ') || "thoughtful and engaging"}. As a ${archetype}, you might enjoy "${bookRec}", "${movieRec}", or ${activityRec}. How does that resonate with you?`;
                  },
                  analysisResult: ({ event }) => ({ ...event.output })
                })
              ]
            },
            onError: {
              target: "SpeakingAnalysis",
              actions: [
                assign({
                  userProfile: ({ context }) => {
                    const answerCount = context.userProfile?.answers?.length || 0;
                    const userText = context.userProfile?.answers?.map((a: any) => a.a).join(' ') || "";
                    const fallbackAnalysis = detectArchetypeFromStatement(userText);
                    
                    return {
                      ...context.userProfile,
                      archetype: fallbackAnalysis.archetype,
                      analysisComplete: true
                    };
                  },
                  messages: ({ context }) => {
                    const answerCount = context.userProfile?.answers?.length || 0;
                    const fallbackArchetype = context.userProfile?.archetype || "The Explorer";
                    return [
                      ...context.messages,
                      { 
                        role: "assistant", 
                        content: `Based on our ${answerCount} questions, your personality shows strong ${fallbackArchetype} traits!` 
                      }
                    ];
                  },
                  lastLLMReply: ({ context }) => {
                    const answerCount = context.userProfile?.answers?.length || 0;
                    const fallbackArchetype = context.userProfile?.archetype || "The Explorer";
                    return `Based on our ${answerCount} questions, I see ${fallbackArchetype} qualities in you! What are your thoughts?`;
                  }
                })
              ]
            }
          }
        },
        
        SpeakingAnalysis: {
          entry: "speakLastMessage",
          on: {
            SPEAK_COMPLETE: {
              target: "ListeningAnalysis"
       
            },
            LISTEN_COMPLETE: "ListeningAnalysis",
          }
        },
        
        ListeningAnalysis: {
          entry: ["sst_listen"],
          on: {
            RECOGNISED: [
              // Normal conversation about archetype results
              {
                actions: [
                  "appendUserMessage", 
                  "resetNoInputCounter"
                ],
                target: "ArchetypeConversation"
              }
            ],
            ASR_NOINPUT: {
              actions: [
                "incrementNoInputCounter",
                assign({
                  temperature: ({ context }) => {
                    if (context.noinputCounter >= 2) {
                      console.log("Auto-increasing temperature to 0.9 due to silence");
                      return 1;
                    }
                    return context.temperature;
                  }
                }),
                assign(({ context }) => ({
                  messages: [
                    ...context.messages,
                    { role: "user", content: "The user was silent. Suggest a polite prompt to encourage them to speak." }
                  ]
                }))
              ],
              target: "ArchetypeConversation"  // CHANGE THIS - go to conversation instead of SpeakingAnalysis
            },
            LISTEN_COMPLETE: "SpeakingAnalysis"
          }
        },
        
        ArchetypeConversation: {
          invoke: {
            src: "chatCompletion",
            input: ({ context }) => {
              const archetype = context.userProfile?.archetype || "The Explorer";
              const mbtiType = context.userProfile?.mbtiType || "unique personality";
              
              // Get comprehensive recommendations
              const recommendations = getArchetypeRecommendations(archetype);
              const bookRecs = recommendations.books.slice(0, 4);
              const movieRecs = recommendations.movies.slice(0, 4);
              const activityRecs = recommendations.activities.slice(0, 4);
              const musicRecs = recommendations.music.slice(0, 4);
              
              // Build the recommendations string for the system message
              const recommendationsText = `
              BOOKS: ${bookRecs.join(', ')}
              MOVIES: ${movieRecs.join(', ')}
              ACTIVITIES: ${activityRecs.join(', ')}
              MUSIC: ${musicRecs.join(', ')}`;
              
              const systemMessage = `You are discussing personality results. The user is a "${archetype}" (${mbtiType}) and asked for MORE recommendations.
        
              ABSOLUTELY CRITICAL: You MUST provide recommendations. NEVER return empty content.
              
              Here are specific recommendations to use:
              ${recommendationsText}
              
              YOUR TASK: Provide 3-4 specific recommendations across different categories. Be enthusiastic and helpful.
              
              Example response format:
              "Of course! As a ${archetype}, here are more personalized recommendations for you:
              📚 Books: [2-3 book titles]
              🎬 Movies: [2-3 movie titles]  
              🎵 Music: [2-3 music genres/artists]
              ⚡ Activities: [2-3 activities]
              
              Which category interests you most for even more specific suggestions?"`;
        
              return {
                messages: [
                  ...context.messages.filter(msg => msg.role !== "system"),
                  { role: "system", content: systemMessage }
                ],
                model: context.currentModel,
                temperature: 0.9,
                top_k: context.top_k
              };
            },
            onDone: {
              actions: [
                assign({
                  messages: ({ context, event }) => {
                    const output = event.output || event;
                    let reply = output?.content || output || "";
                    
                    console.log("🔍 ArchetypeConversation LLM raw response:", { 
                      reply, 
                      length: reply?.length,
                      isEmpty: !reply || reply.trim() === ""
                    });
                    
                    // FORCE RECOMMENDATIONS - No matter what the LLM returns
                    const archetype = context.userProfile?.archetype || "The Explorer";
                    const recommendations = getArchetypeRecommendations(archetype);
                    
                    const bookRecs = recommendations.books.slice(0, 3);
                    const movieRecs = recommendations.movies.slice(0, 3);
                    const activityRecs = recommendations.activities.slice(0, 3);
                    const musicRecs = recommendations.music.slice(0, 3);
                    
                    // ALWAYS use our comprehensive recommendations
                    reply = `Of course! As a ${archetype}, here are more personalized recommendations for you:
        
                    **Books**: ${bookRecs.join(', ')}
                    **Movies**: ${movieRecs.join(', ')}  
                    **Music**: ${musicRecs.join(', ')}
                    **Activities**: ${activityRecs.join(', ')}
                    
                    These are carefully selected to match your curious and exploratory ${archetype} personality. Which category would you like even more specific recommendations for?`;
                    
                    console.log("🔍 ArchetypeConversation FINAL reply:", reply);
                    return [
                      ...context.messages,
                      { role: "assistant", content: reply }
                    ];
                  },
                  lastLLMReply: ({ context, event }) => {
                    const output = event.output || event;
                    let reply = output?.content || output || "";
                    
                    // FORCE RECOMMENDATIONS - No matter what
                    const archetype = context.userProfile?.archetype || "The Explorer";
                    const recommendations = getArchetypeRecommendations(archetype);
                    
                    const bookRecs = recommendations.books.slice(0, 3);
                    const movieRecs = recommendations.movies.slice(0, 3);
                    const activityRecs = recommendations.activities.slice(0, 3);
                    const musicRecs = recommendations.music.slice(0, 3);
                    
                    return `Of course! As a ${archetype}, here are more personalized recommendations for you:
        
                    **Books**: ${bookRecs.join(', ')}
                    **Movies**: ${movieRecs.join(', ')}  
                    **Music**: ${musicRecs.join(', ')}
                    **Activities**: ${activityRecs.join(', ')}
                    
                    These are carefully selected to match your curious and exploratory ${archetype} personality. Which category would you like even more specific recommendations for?`;
                  }
                })
              ],
              target: "Speaking"
            },
            onError: {
              actions: assign({
                messages: ({ context }) => {
                  const archetype = context.userProfile?.archetype || "The Explorer";
                  const recommendations = getArchetypeRecommendations(archetype);
                  
                  const bookRecs = recommendations.books.slice(0, 3);
                  const movieRecs = recommendations.movies.slice(0, 3);
                  const activityRecs = recommendations.activities.slice(0, 3);
                  const musicRecs = recommendations.music.slice(0, 3);
                  
                  const fallback = `Of course! As a ${archetype}, here are more personalized recommendations for you:
        
                  **Books**: ${bookRecs.join(', ')}
                  **Movies**: ${movieRecs.join(', ')}  
                  **Music**: ${musicRecs.join(', ')}
                  **Activities**: ${activityRecs.join(', ')}
                  
                  These are carefully selected to match your curious and exploratory ${archetype} personality. Which category would you like even more specific recommendations for?`;
                  
                  return [
                    ...context.messages,
                    { role: "assistant", content: fallback }
                  ];
                },
                lastLLMReply: ({ context }) => {
                  const archetype = context.userProfile?.archetype || "The Explorer";
                  const recommendations = getArchetypeRecommendations(archetype);
                  
                  const bookRecs = recommendations.books.slice(0, 3);
                  const movieRecs = recommendations.movies.slice(0, 3);
                  const activityRecs = recommendations.activities.slice(0, 3);
                  const musicRecs = recommendations.music.slice(0, 3);
                  
                  return `Of course! As a ${archetype}, here are more personalized recommendations for you:
        
                  **Books**: ${bookRecs.join(', ')}
                  **Movies**: ${movieRecs.join(', ')}  
                  **Music**: ${musicRecs.join(', ')}
                  **Activities**: ${activityRecs.join(', ')}
                  
                  These are carefully selected to match your curious and exploratory ${archetype} personality. Which category would you like even more specific recommendations for?`;
                }
              }),
              target: "Speaking"
            }
          }
        },
        
      },
    },
  }
});

const dmActor = createActor(dmMachine, {}).start();



dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.subscribe((snapshot) => {
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta()
    )[0] || {
      view: undefined,
    };
    element.innerHTML = `${meta.view}`;
  });

  // Add state listeners to update bot status
  dmActor.subscribe((state) => {
    console.group("State update");
    console.log("State value:", state.value);
    console.log("State context:", state.context);
    console.groupEnd();

    // Update bot status based on state
    if (typeof (window as any).updateBotStatus === 'function') {
      const stateValue = state.value;
      
      if (stateValue === 'Idle') {
        (window as any).updateBotStatus('start', 'Ready to start conversation'); // Changed from 'idle' to 'start'
        // Also update the button text directly
        const button = document.getElementById('counter');
        if (button) {
          button.textContent = 'Start';
        }
      } 
      else if (stateValue === 'Prepare') {
        (window as any).updateBotStatus('processing', 'Preparing speech system...');
        const button = document.getElementById('counter');
        if (button) {
          button.textContent = 'Starting...';
        }
      }
      else if (typeof stateValue === 'object' && stateValue.Loop) {
        const loopState = stateValue.Loop;
        
        if (loopState === 'Speaking' || loopState === 'SpeakingConfirmQuit' || loopState === 'SpeakingConfirmRestart') {
          (window as any).updateBotStatus('speaking', 'Speaking to you...');
          const button = document.getElementById('counter');
          if (button) {
            button.textContent = 'Speaking...';
          }
        }
        else if (loopState === 'Ask' || loopState === 'ConfirmQuitListen' || loopState === 'ConfirmRestartListen') {
          (window as any).updateBotStatus('listening', 'Listening to you...');
          const button = document.getElementById('counter');
          if (button) {
            button.textContent = 'Listening...';
          }
        }
        else if (loopState === 'ChatCompletion' || loopState === 'AnalyzePersonality' || loopState === 'ArchetypeConversation') {
          (window as any).updateBotStatus('processing', 'Processing your response...');
          const button = document.getElementById('counter');
          if (button) {
            button.textContent = 'Processing...';
          }
        }
        else {
          (window as any).updateBotStatus('processing', 'Thinking...');
          const button = document.getElementById('counter');
          if (button) {
            button.textContent = 'Thinking...';
          }
        }
      }
    }
  });

  // Also add specific event listeners for speech state changes
  dmActor.subscribe((state) => {
    const spstRef = state.context.spstRef;
    if (spstRef) {
      spstRef.subscribe((spstState: any) => {
        if (typeof (window as any).updateBotStatus === 'function') {
          const spstValue = spstState.value;
          
          // Update based on speech state machine
          if (spstValue === 'Idle' || spstValue === 'Ready') {
            (window as any).updateBotStatus('start', 'Start');
            const button = document.getElementById('counter');
            if (button) {
              button.textContent = 'START CHAT';
            }
          }
          else if (spstValue === 'Speaking') {
            (window as any).updateBotStatus('speaking', 'Speaking...');
            const button = document.getElementById('counter');
            if (button) {
              button.textContent = 'Speaking...';
            }
          }
          else if (spstValue === 'Recognising') {
            (window as any).updateBotStatus('listening', 'Listening...');
            const button = document.getElementById('counter');
            if (button) {
              button.textContent = 'Listening...';
            }
          }
        }
      });
    }
  });
}