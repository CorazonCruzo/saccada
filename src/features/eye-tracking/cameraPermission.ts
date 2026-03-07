export type CameraPermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable'

/**
 * Check current camera permission state without triggering a prompt.
 * Falls back to 'prompt' if Permissions API is not supported.
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'unavailable'
  }

  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return status.state as CameraPermissionState
  } catch {
    // Permissions API not supported (e.g. Firefox for camera), assume prompt
    return 'prompt'
  }
}

/**
 * Request camera access. Returns true if granted, false otherwise.
 * If permission is already granted, resolves immediately.
 * If denied, returns false without showing a system prompt (browser blocks it).
 */
export async function requestCameraAccess(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    // Stop the tracks immediately; we just needed the permission grant.
    // WebGazer will open its own stream.
    for (const track of stream.getTracks()) {
      track.stop()
    }
    return true
  } catch {
    return false
  }
}
