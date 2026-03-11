import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useSessionStore } from '@/entities/session'
import { pralokita } from '@/entities/pattern'

// ── Mocks ──

// Stub ResizeObserver for Radix UI components
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver

const mockCheckPermission = vi.fn<() => Promise<string>>()
const mockRequestAccess = vi.fn<() => Promise<boolean>>()

vi.mock('@/features/eye-tracking', () => ({
  checkCameraPermission: (...args: unknown[]) => mockCheckPermission(...args),
  requestCameraAccess: (...args: unknown[]) => mockRequestAccess(...args),
}))

vi.mock('@/features/haptics', () => ({
  canVibrate: () => false,
}))

// Minimal i18n mock
vi.mock('@/shared/lib/i18n', () => ({
  useTranslation: () => ({
    t: {
      sessionSettings: {
        title: 'Session Settings',
        duration: 'Duration',
        speed: 'Speed',
        sound: 'Sound',
        guided: 'Guided',
        eyeTracking: 'Eye Tracking',
        haptic: 'Haptic',
        volume: 'Vol',
        timerMode: 'Timer',
        stopwatchMode: 'Stopwatch',
        unlimited: 'Unlimited',
        visualScale: 'Visual Scale',
        visualScaleHint: 'hint',
        headphonesRecommended: 'Headphones recommended',
        calibrationNeeded: 'Calibration needed',
        calibrated: 'Calibrated',
        recalibrate: 'Recalibrate',
        beginSession: 'Begin Session',
        cameraNotAvailable: 'Camera not available',
        cameraDenied: 'Camera denied',
        background: 'Background',
        backgroundRotation: 'Rotation',
        rotationNone: 'None',
        rotationCW: 'CW',
        rotationCCW: 'CCW',
        resetBackground: 'Reset',
      },
      trajectory: { horizontal: 'Horizontal' },
      backgroundName: {
        zen: 'Zen', aura: 'Aura', ripples: 'Ripples', fibonacci: 'Fibonacci',
        'seed-of-life': 'Seed of Life', mandala: 'Mandala', penrose: 'Penrose',
        'flower-of-life': 'Flower of Life', 'metatrons-cube': "Metatron's Cube", moire: 'Moire',
        'standing-wave': 'Standing Wave',
        'perlin-flow': 'Perlin Flow',
      },
    },
    tp: () => ({ name: 'Pralokita', description: '' }),
  }),
}))

// Mock Dialog to just render children
vi.mock('@/shared/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

import { SettingsPanel } from './SettingsPanel'

function getEyeTrackingButton() {
  return screen.getByText('Eye Tracking').closest('button')!
}

describe('SettingsPanel — eye tracking toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({
      selectedPattern: pralokita,
      eyeTrackingEnabled: false,
      sessionDuration: 120_000,
      speed: 1,
      volume: 50,
      soundEnabled: true,
      hapticEnabled: false,
      guidedMode: false,
      calibratedAt: null,
      visualScale: 1,
    })
  })

  it('does not call requestCameraAccess when permission is already granted', async () => {
    mockCheckPermission.mockResolvedValue('granted')

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(mockCheckPermission).toHaveBeenCalled()
    expect(mockRequestAccess).not.toHaveBeenCalled()
    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(true)
  })

  it('calls requestCameraAccess when permission is prompt', async () => {
    // First call returns 'prompt' (toggle handler), subsequent return 'granted' (useEffect check)
    mockCheckPermission
      .mockResolvedValueOnce('prompt')
      .mockResolvedValue('granted')
    mockRequestAccess.mockResolvedValue(true)

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(mockCheckPermission).toHaveBeenCalled()
    expect(mockRequestAccess).toHaveBeenCalledOnce()
    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(true)
  })

  it('does not enable tracking when requestCameraAccess returns false', async () => {
    mockCheckPermission.mockResolvedValue('prompt')
    mockRequestAccess.mockResolvedValue(false)

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
  })

  it('does not call requestCameraAccess when permission is denied', async () => {
    mockCheckPermission.mockResolvedValue('denied')

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(mockRequestAccess).not.toHaveBeenCalled()
    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
  })

  it('does not call requestCameraAccess when camera is unavailable', async () => {
    mockCheckPermission.mockResolvedValue('unavailable')

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(mockRequestAccess).not.toHaveBeenCalled()
    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
  })

  it('toggles off without any camera calls', async () => {
    useSessionStore.setState({ eyeTrackingEnabled: true })
    mockCheckPermission.mockResolvedValue('granted')

    render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)

    await act(async () => {
      getEyeTrackingButton().click()
    })

    expect(mockRequestAccess).not.toHaveBeenCalled()
    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
  })

  it('auto-disables eye tracking when permission was revoked', async () => {
    useSessionStore.setState({ eyeTrackingEnabled: true, calibratedAt: Date.now() })
    mockCheckPermission.mockResolvedValue('denied')

    await act(async () => {
      render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)
    })

    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
    expect(useSessionStore.getState().calibratedAt).toBeNull()
  })

  it('keeps eye tracking enabled when permission is still granted', async () => {
    useSessionStore.setState({ eyeTrackingEnabled: true, calibratedAt: Date.now() })
    mockCheckPermission.mockResolvedValue('granted')

    await act(async () => {
      render(<SettingsPanel open onOpenChange={vi.fn()} onStart={vi.fn()} />)
    })

    expect(useSessionStore.getState().eyeTrackingEnabled).toBe(true)
    expect(useSessionStore.getState().calibratedAt).not.toBeNull()
  })
})
