/**
 * Analytics hooks are no-ops. The static app does not send events off-origin.
 * Call sites keep these names so feature code does not change.
 */

export function trackEvent(
  _eventName: string,
  _eventData?: Record<string, string | number | boolean>
): void {}

export function identifyUser(
  _userId: string,
  _properties?: Record<string, string | number | boolean>
): void {}

export function resetUser(): void {}

export function trackImageUpload(_source: "file" | "paste" | "drop" | "url", _fileSize?: number): void {}

export function trackExportStart(_format: string, _quality: string, _scale: number): void {}

export function trackExportComplete(
  _format: string,
  _quality: string,
  _scale: number,
  _fileSizeKb: number,
  _durationMs: number
): void {}

export function trackExportError(_format: string, _error: string): void {}

export function trackCopyToClipboard(_success: boolean): void {}

export function trackBackgroundChange(
  _type: "gradient" | "solid" | "image" | "transparent",
  _value?: string
): void {}

export function trackEffectApply(
  _effectType: "shadow" | "border" | "radius" | "blur" | "noise" | "filter" | "3d_transform",
  _value?: string | number
): void {}

export function trackFrameApply(_frameType: string): void {}

export function trackPresetApply(_presetId: string, _presetName: string): void {}

export function trackOverlayAdd(_overlayType: "text" | "image" | "sticker"): void {}

export function trackAspectRatioChange(_ratio: string): void {}

export function trackAnimationClipAdd(_presetId: string, _presetName: string, _duration: number): void {}

export function trackSessionStart(): void {}

export function trackEditorOpen(): void {}

export function trackCTAClick(_location: string, _label: string): void {}

export function trackError(_errorType: string, _message: string): void {}
