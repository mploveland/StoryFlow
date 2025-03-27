import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for image generation request
export interface ImageGenerationRequest {
  prompt: string;
  style?: 'portrait' | 'cinematic' | 'fantasy' | 'realistic' | 'anime' | string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | string;
  negativePrompt?: string; // Things to avoid in the image
}

/**
 * Generate an image using OpenAI's DALL-E model
 * @param options Image generation options
 * @returns URL of the generated image
 */
export async function generateImage(options: ImageGenerationRequest): Promise<string> {
  try {
    // Enhance the prompt based on the style
    let enhancedPrompt = options.prompt;
    
    if (options.style) {
      switch (options.style) {
        case 'portrait':
          enhancedPrompt += `, professional portrait, high quality, detailed facial features, professional lighting, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
          break;
        case 'cinematic':
          enhancedPrompt += `, cinematic shot, dramatic lighting, movie quality, high resolution, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
          break;
        case 'fantasy':
          enhancedPrompt += `, fantasy art style, magical, ethereal, vibrant colors, detailed environment, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
          break;
        case 'realistic':
          enhancedPrompt += `, photorealistic, highly detailed, professional photograph, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
          break;
        case 'anime':
          enhancedPrompt += `, anime style, detailed, vibrant, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
          break;
        default:
          enhancedPrompt += `, ${options.style} style, ${options.negativePrompt ? `without ${options.negativePrompt}` : ''}`;
      }
    }
    
    // Determine size based on aspect ratio
    let size = "1024x1024"; // Default square
    if (options.aspectRatio) {
      switch (options.aspectRatio) {
        case '16:9':
          size = "1792x1024"; // Landscape
          break;
        case '4:3':
          size = "1024x768"; // Standard
          break;
        // Default to square if unrecognized
      }
    }
    
    console.log(`Generating image with prompt: "${enhancedPrompt}", size: ${size}`);
    
    // Generate the image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: size as any, // Type assertion needed due to OpenAI types expecting specific sizes
      quality: "standard",
    });
    
    // Return the URL of the generated image
    const imageUrl = response.data[0]?.url;
    
    if (!imageUrl) {
      throw new Error("No image URL returned from the API");
    }
    
    return imageUrl as string;
    
  } catch (error: any) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`);
  }
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
  const prompt = `Portrait of ${character.name}, ${character.gender || ''} character, ${character.age || 'adult'}, 
  ${character.appearance || ''}, ${character.hairDetails || ''}, ${character.eyeDetails || ''}. 
  Highly detailed character portrait, professional lighting, high quality, photorealistic.`;
  
  return generateImage({
    prompt,
    style: 'portrait',
    aspectRatio: '1:1'
  });
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
  const prompt = `${character.name} in a scene, ${character.appearance || ''}, 
  ${character.typicalAttire || ''}, ${sceneDescription || 'in an action pose or dramatic scene'}.
  Highly detailed illustration, cinematic lighting, dramatic.`;
  
  return generateImage({
    prompt,
    style: 'cinematic',
    aspectRatio: '16:9'
  });
}