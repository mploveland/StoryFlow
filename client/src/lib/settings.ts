import { apiRequest } from './queryClient';

/**
 * Update an API key for a service
 * @param provider The provider to update the API key for ('elevenlabs' or 'openai')
 * @param apiKey The new API key
 * @returns Success status and message
 */
export async function updateApiKey(
  provider: 'elevenlabs' | 'openai',
  apiKey: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiRequest('POST', '/api/settings/api-key', {
      provider,
      apiKey,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(
        data.message || `Failed to update ${provider} API key: ${response.status}`
      );
    }
    
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error: any) {
    console.error(`Error updating ${provider} API key:`, error);
    throw new Error(error.message || `Failed to update ${provider} API key`);
  }
}