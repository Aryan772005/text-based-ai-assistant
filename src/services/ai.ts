import { supabase } from '../lib/supabase';

// Helper to convert File to base64 for LLM vision models
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export async function uploadMediaToSupabase(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data: _data, error } = await supabase.storage
    .from('media') // Assumes a 'media' bucket exists
    .upload(filePath, file);

  if (error) {
    console.error('Upload Error:', error.message);
    throw error;
  }
  
  const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}

export async function getAIResponse(messages: { role: string; content: string | any[] }[], maxTokens = 1000) {
  let apiKey = import.meta.env.VITE_NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error('NVIDIA API Key is missing');
  }
  
  // Clean up prefix if needed, although user provided "Bearer nvapi..."
  if (!apiKey.startsWith('Bearer ')) {
    apiKey = `Bearer ${apiKey}`;
  }

  // Use Vite proxy path to avoid CORS — proxied to https://integrate.api.nvidia.com
  const response = await fetch('/api/nvidia/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      model: "meta/llama-3.2-90b-vision-instruct", 
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
