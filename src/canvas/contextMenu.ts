export interface SecondaryContextMenuGestureLike {
  button?: number
  buttons?: number
  ctrlKey?: boolean
  which?: number
}

export function isSecondaryContextMenuGesture(
  event: SecondaryContextMenuGestureLike,
): boolean {
  return (
    event.button === 2 ||
    event.buttons === 2 ||
    event.which === 3 ||
    (event.ctrlKey === true &&
      (event.button === 0 || event.button === undefined))
  )
}
