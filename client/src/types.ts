// Define core application types for client use

export interface User {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
}

export interface Foundation {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  genre: string | null;
  threadId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Story {
  id: number;
  foundationId: number;
  userId: number;
  title: string;
  synopsis?: string | null;
  theme?: string | null;
  setting?: string | null;
  creationProgress?: string | null;
  status?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Chapter {
  id: number;
  storyId: number;
  title: string;
  content?: string | null;
  order: number;
  wordCount?: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Character {
  id: number;
  foundationId: number;
  name: string;
  role?: string | null;
  background?: string | null;
  personality?: string[] | null;
  goals?: string[] | null;
  fears?: string[] | null;
  skills?: string[] | null;
  appearance?: string | null;
  voice?: string | null;
  secrets?: string | null;
  quirks?: string[] | null;
  motivations?: string[] | null;
  flaws?: string[] | null;
  threadId?: string | null;
  evolutionStage?: number | null;
  significantEvents?: any[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CharacterDetails {
  id: number;
  foundationId: number;
  character_name: string;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  nationality_ethnicity?: string | null;
  current_residence?: string | null;
  
  // Physical Description
  height_build?: string | null;
  hair_description?: string | null;
  eye_description?: string | null;
  skin_complexion?: string | null;
  facial_features?: string | null;
  distinctive_features?: string | null;
  body_type?: string | null;
  posture_body_language?: string | null;
  typical_attire?: string | null;
  general_impression?: string | null;
  
  // Backstory
  birthplace_family_background?: string | null;
  childhood_experiences?: string | null;
  education_training?: string | null;
  major_life_events?: string | null;
  current_life_circumstances?: string | null;
  
  // Psychological Profile
  personality_type?: string | null;
  core_beliefs_values?: string | null;
  fears_insecurities?: string | null;
  emotional_stability?: string | null;
  coping_mechanisms?: string | null;
  
  // Emotional Profile
  dominant_mood?: string | null;
  emotional_triggers?: string | null;
  emotional_strengths_weaknesses?: string | null;
  response_to_conflict_stress?: string | null;
  
  // Speech
  speech_accent_dialect?: string | null;
  speech_pace_tone?: string | null;
  common_phrases_quirks?: string | null;
  formality_level?: string | null;
  
  // Preferences & Personality
  hobbies_interests?: string | null;
  favorite_activities?: string | null;
  favorite_foods_drinks?: string | null;
  pet_peeves?: string | null;
  disliked_activities?: string | null;
  
  // Motivations
  short_term_goals?: string | null;
  long_term_aspirations?: string | null;
  deepest_desires?: string | null;
  driving_motivations?: string | null;
  
  // Relationships
  family_dynamics?: string | null;
  friendships_social_life?: string | null;
  romantic_relationships?: string | null;
  professional_relationships?: string | null;
  enemies_rivals?: string | null;
  
  // Internal Conflict
  secrets_hidden_aspects?: string | null;
  personal_contradictions?: string | null;
  internal_conflicts?: string | null;
  
  // Legacy fields (compatibility with Character)
  role?: string | null;
  background?: string | null;
  personality?: string[] | null;
  goals?: string[] | null;
  fears?: string[] | null;
  skills?: string[] | null;
  appearance?: string | null;
  voice?: string | null;
  secrets?: string | null;
  quirks?: string[] | null;
  motivations?: string[] | null;
  flaws?: string[] | null;
  
  // References / Metadata
  threadId?: string | null;
  genre_id?: number | null;
  environment_id?: number | null;
  world_id?: number | null;
  
  // Character type/evolution tracking
  character_type?: string | null;
  evolutionStage?: number | null;
  significantEvents?: any[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface GenreDetails {
  id: number;
  foundationId: number;
  name?: string | null;
  mainGenre: string;
  description?: string | null;
  genreRationale?: string | null;
  audienceExpectations?: string | null;
  subgenres?: string | null;
  subgenreRationale?: string | null;
  subgenreInteraction?: string | null;
  subgenreTropes?: string | null;
  tone?: string | null;
  mood?: string | null;
  emotionalImpact?: string | null;
  timePeriod?: string | null;
  technologyLevel?: string | null;
  physicalEnvironment?: string | null;
  geography?: string | null;
  societalStructures?: string | null;
  culturalNorms?: string | null;
  keyTropes?: string | null;
  tropeStrategy?: string | null;
  speculativeElements?: string | null;
  speculativeRules?: string | null;
  atmosphere?: string | null;
  sensoryDetails?: string | null;
  atmosphericStyle?: string | null;
  thematicEnvironmentTieins?: string | null;
  inspirations?: string | null;
  inspirationDetails?: string | null;
  divergenceFromInspirations?: string | null;
  themes?: string[] | null;
  tropes?: string[] | null;
  commonSettings?: string[] | null;
  typicalCharacters?: string[] | null;
  plotStructures?: string[] | null;
  styleGuide?: {
    tone?: string | null;
    pacing?: string | null;
    perspective?: string | null;
    dialogueStyle?: string | null;
  } | null;
  recommendedReading?: string[] | null;
  popularExamples?: string[] | null;
  worldbuildingElements?: string[] | null;
  threadId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WorldDetails {
  id: number;
  foundationId: number;
  name: string;
  description: string;
  era: string;
  geography: string[];
  locations: string[];
  culture: {
    socialStructure: string;
    beliefs: string;
    customs: string[];
    languages: string[];
  };
  politics: {
    governmentType: string;
    powerDynamics: string;
    majorFactions: string[];
  };
  economy: {
    resources: string[];
    trade: string;
    currency: string;
  };
  technology: {
    level: string;
    innovations: string[];
    limitations: string;
  };
  conflicts: string[];
  history: {
    majorEvents: string[];
    legends: string[];
  };
  magicSystem?: {
    rules: string;
    limitations: string;
    practitioners: string;
  } | null;
  threadId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EnvironmentDetails {
  id: number;
  foundationId: number;
  name: string;
  description: string;
  locationType: string;
  worldContext: string;
  physicalAttributes: {
    size: string;
    terrain: string;
    climate: string;
    flora: string[];
    fauna: string[];
  };
  structuralFeatures: string[];
  sensoryDetails: {
    sights: string[];
    sounds: string[];
    smells: string[];
    textures: string[];
  };
  inhabitants: {
    residents: string[];
    visitors: string[];
    controllingFaction: string;
  };
  culture: {
    traditions: string[];
    laws: string[];
    attitudes: string;
  };
  history: {
    origin: string;
    significantEvents: string[];
    secrets: string[];
  };
  currentState: {
    condition: string;
    atmosphere: string;
    conflicts: string[];
  };
  storyRelevance: {
    purpose: string;
    challenges: string[];
    rewards: string[];
  };
  connections: {
    linkedLocations: string[];
    accessPoints: string[];
  };
  threadId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}