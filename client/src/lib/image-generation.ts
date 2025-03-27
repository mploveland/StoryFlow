/**
 * Interface for image generation request parameters
 */
export interface ImageGenerationRequest {
  prompt: string;
  style?: 'portrait' | 'cinematic' | 'fantasy' | 'realistic' | 'anime' | string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | string;
  negativePrompt?: string;
}

interface ImageResponse {
  imageUrl: string;
}

/**
 * Generate an image using OpenAI's DALL-E model
 * @param options Image generation options
 * @returns URL of the generated image
 */
export async function generateImage(options: ImageGenerationRequest): Promise<string> {
  const response = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate image: ${response.statusText}`);
  }
  
  const data = await response.json() as ImageResponse;
  return data.imageUrl;
}

/**
 * Generate a character portrait using OpenAI's DALL-E model
 * @param character Character details
 * @returns URL of the generated portrait
 */
export async function generateCharacterPortrait(character: {
  name: string;
  appearance?: string;
  gender?: string;
  age?: string;
  hairDetails?: string;
  eyeDetails?: string;
}): Promise<string> {
  const response = await fetch('/api/images/character-portrait', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(character),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate character portrait: ${response.statusText}`);
  }
  
  const data = await response.json() as ImageResponse;
  return data.imageUrl;
}

/**
 * Generate a character scene image using OpenAI's DALL-E model
 * @param character Character details
 * @param sceneDescription Optional scene description
 * @returns URL of the generated scene image
 */
export async function generateCharacterScene(character: {
  name: string;
  appearance?: string;
  typicalAttire?: string;
}, sceneDescription?: string): Promise<string> {
  const response = await fetch('/api/images/character-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...character,
      sceneDescription
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate character scene: ${response.statusText}`);
  }
  
  const data = await response.json() as ImageResponse;
  return data.imageUrl;
}