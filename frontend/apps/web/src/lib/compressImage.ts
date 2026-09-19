export type CompressImageOptions = {
  maxWidth: number
  maxHeight: number
  /** JPEG quality from 0–1. */
  quality: number
}

export const PROFILE_PHOTO_COMPRESS = {
  avatar: { maxWidth: 1080, maxHeight: 1080, quality: 0.82 },
  gallery: { maxWidth: 1440, maxHeight: 1440, quality: 0.8 },
} as const satisfies Record<string, CompressImageOptions>

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const PASSTHROUGH_TYPES = new Set(['image/gif', 'image/svg+xml'])
const JPEG_TYPES = new Set(['image/jpeg', 'image/jpg'])

function isJpeg(file: File): boolean {
  return JPEG_TYPES.has(file.type)
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      throw new Error('This image format is not supported. Try a JPEG or PNG.')
    }
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not process this image. Try a JPEG or PNG.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Shrinks and JPEG-encodes a photo in the browser before upload.
 * GIFs/SVGs are left alone; files over 20MB are rejected.
 */
export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Photo is too large. Choose a file under 20MB.')
  }
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error('Please choose an image file.')
  }
  if (PASSTHROUGH_TYPES.has(file.type)) return file

  const bitmap = await decodeImage(file)
  try {
    const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height)
    const needsResize = scale < 1
    if (!needsResize && isJpeg(file)) return file

    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      if (isJpeg(file) || file.type === 'image/png' || file.type === 'image/webp') return file
      throw new Error('Could not process this image. Try a JPEG or PNG.')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToJpeg(canvas, options.quality)
    if (blob.size >= file.size && !needsResize) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
