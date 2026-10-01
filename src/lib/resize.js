const MAX_WIDTH = 1920

function scaledSize(width, height) {
  if (!width || !height || width <= MAX_WIDTH) return { width, height, scale: false }
  return {
    width: MAX_WIDTH,
    height: Math.max(1, Math.round((height * MAX_WIDTH) / width)),
    scale: true,
  }
}

async function drawToJpeg(source, width, height, name) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(source, 0, 0, width, height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) return null
  const nextName = name.replace(/\.[^.]+$/, '') || 'photo'
  return {
    file: new File([blob], `${nextName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }),
    width,
    height,
  }
}

export async function resizeForDisplay(file) {
  if (!file) return { file, width: null, height: null }
  const type = file.type || ''
  if (type.includes('heic') || type.includes('heif')) return { file, width: null, height: null }
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      try {
        const next = scaledSize(bitmap.width, bitmap.height)
        if (!next.scale) return { file, width: bitmap.width, height: bitmap.height }
        const jpeg = await drawToJpeg(bitmap, next.width, next.height, file.name)
        return jpeg || { file, width: bitmap.width, height: bitmap.height }
      } finally {
        bitmap.close?.()
      }
    }
  } catch {
    return { file, width: null, height: null }
  }
  return { file, width: null, height: null }
}
