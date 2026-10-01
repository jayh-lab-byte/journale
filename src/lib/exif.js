import exifr from 'exifr'

export async function readPhotoMeta(file) {
  try {
    const data = await exifr.parse(file, { gps: true, reviveValues: true })
    if (!data) return {}
    const date = data.DateTimeOriginal || data.CreateDate || null
    let takenAt = null
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      const pad = (value) => String(value).padStart(2, '0')
      takenAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000Z`
    }
    const latitude = typeof data.latitude === 'number' ? data.latitude : null
    const longitude = typeof data.longitude === 'number' ? data.longitude : null
    return {
      takenAt,
      latitude,
      longitude,
      width: data.ExifImageWidth || data.ImageWidth || null,
      height: data.ExifImageHeight || data.ImageHeight || null,
    }
  } catch {
    return { exifFailed: true }
  }
}

export function isSupportedPhoto(file) {
  const name = file.name.toLowerCase()
  const types = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg']
  return types.includes(file.type) || /\.(jpe?g|png|heic|heif)$/.test(name)
}
