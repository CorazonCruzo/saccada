declare module 'webgazer' {
  interface GazePrediction {
    x: number
    y: number
  }

  type GazeListener = (data: GazePrediction | null, elapsedTime: number) => void

  const webgazer: {
    setGazeListener(listener: GazeListener): typeof webgazer
    removeGazeListener(): typeof webgazer
    begin(): Promise<typeof webgazer>
    end(): typeof webgazer
    pause(): typeof webgazer
    resume(): Promise<typeof webgazer>
    isReady(): boolean
    showVideoPreview(show: boolean): typeof webgazer
    showPredictionPoints(show: boolean): typeof webgazer
    showFaceOverlay(show: boolean): typeof webgazer
    showFaceFeedbackBox(show: boolean): typeof webgazer
    setRegression(type: string): typeof webgazer
    setTracker(type: string): typeof webgazer
    recordScreenPosition(x: number, y: number, eventType: string): void
    getCurrentPrediction(): Promise<GazePrediction | null>
    clearData(): void
    applyKalmanFilter(apply: boolean): typeof webgazer
    saveDataAcrossSessions(save: boolean): typeof webgazer
    removeMouseEventListeners(): typeof webgazer
  }

  export default webgazer
}
