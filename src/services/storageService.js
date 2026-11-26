import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BUCKET_NAME = 'hazard-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

/**
 * Validates and uploads a hazard image file directly to Supabase Storage.
 *
 * @param {File} file - The file to upload
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadHazardPhoto(file) {
  if (!file) return null;

  // 1. Validation: File type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file format. Please upload a JPEG, PNG, WebP, or GIF image.');
  }

  // 2. Validation: File size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image size exceeds 5MB limit. Please choose a smaller photo.');
  }

  // 3. Supabase configuration check
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Storage is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  }

  // 4. Generate unique, collision-resistant file path
  const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const filePath = `reports/${timestamp}_${randomStr}.${fileExt}`;

  // 5. Upload to hazard-images bucket
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('[Storage] Upload error:', error);
    if (error.message && (error.message.includes('not found') || error.message.includes('Bucket'))) {
      throw new Error(`Storage bucket '${BUCKET_NAME}' does not exist in your Supabase project. Please run the SQL migration to create it.`);
    }
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  // 6. Retrieve public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded photo.');
  }

  return urlData.publicUrl;
}
