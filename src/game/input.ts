/**
 * One mutable input snapshot shared by the keyboard handler, the on-screen
 * joystick and the render loop. Keeping it outside React state means moving the
 * player never triggers a re-render.
 */
export type InputState = {
  /** -1..1, positive is forward. */
  forward: number;
  /** -1..1, positive is strafe right. */
  strafe: number;
  /** -1..1, positive turns right. */
  turn: number;
  /** -1..1, positive looks up. */
  pitch: number;
  run: boolean;
  /** Set true for one frame when interact is pressed. */
  interactPressed: boolean;
};

export const input: InputState = {
  forward: 0,
  strafe: 0,
  turn: 0,
  pitch: 0,
  run: false,
  interactPressed: false,
};

export function resetInput() {
  input.forward = 0;
  input.strafe = 0;
  input.turn = 0;
  input.pitch = 0;
  input.run = false;
  input.interactPressed = false;
}

/** Keys currently held, by logical action. */
const held = new Set<string>();

/** iOS UIKeyboardHIDUsage codes for the keys that carry no character. */
const HID = {
  right: 79,
  left: 80,
  down: 81,
  up: 82,
  space: 44,
  enter: 40,
  escape: 41,
  tab: 43,
  shiftLeft: 225,
  shiftRight: 229,
} as const;

export type LogicalKey =
  | 'forward'
  | 'back'
  | 'strafeLeft'
  | 'strafeRight'
  | 'turnLeft'
  | 'turnRight'
  | 'lookUp'
  | 'lookDown'
  | 'run'
  | 'interact'
  | 'escape'
  | 'map';

export function keyFor(keyCode: number, char: string): LogicalKey | null {
  const c = (char || '').toLowerCase();
  switch (c) {
    case 'w':
      return 'forward';
    case 's':
      return 'back';
    case 'a':
      return 'strafeLeft';
    case 'd':
      return 'strafeRight';
    case 'q':
      return 'turnLeft';
    case 'e':
      return 'turnRight';
    case 'f':
      return 'interact';
    case 'm':
      return 'map';
    case 'r':
      return 'lookUp';
    case 'v':
      return 'lookDown';
    default:
      break;
  }
  switch (keyCode) {
    case HID.up:
      return 'forward';
    case HID.down:
      return 'back';
    case HID.left:
      return 'turnLeft';
    case HID.right:
      return 'turnRight';
    case HID.space:
    case HID.enter:
      return 'interact';
    case HID.escape:
      return 'escape';
    case HID.shiftLeft:
    case HID.shiftRight:
      return 'run';
    default:
      return null;
  }
}

function applyHeld() {
  input.forward = (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0);
  input.strafe = (held.has('strafeRight') ? 1 : 0) - (held.has('strafeLeft') ? 1 : 0);
  input.turn = (held.has('turnRight') ? 1 : 0) - (held.has('turnLeft') ? 1 : 0);
  input.pitch = (held.has('lookUp') ? 1 : 0) - (held.has('lookDown') ? 1 : 0);
  input.run = held.has('run');
}

export function pressKey(key: LogicalKey) {
  if (key === 'interact') {
    input.interactPressed = true;
    return;
  }
  held.add(key);
  applyHeld();
}

export function releaseKey(key: LogicalKey) {
  held.delete(key);
  applyHeld();
}

export function releaseAllKeys() {
  held.clear();
  applyHeld();
}

export function consumeInteract(): boolean {
  if (!input.interactPressed) return false;
  input.interactPressed = false;
  return true;
}

/** Joystick input is merged with the keyboard rather than replacing it. */
export function setStick(forward: number, strafe: number) {
  const keyForward = (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0);
  const keyStrafe = (held.has('strafeRight') ? 1 : 0) - (held.has('strafeLeft') ? 1 : 0);
  input.forward = Math.max(-1, Math.min(1, keyForward + forward));
  input.strafe = Math.max(-1, Math.min(1, keyStrafe + strafe));
}

/** Look-drag deltas, in radians, applied once then cleared by the render loop. */
export const lookDelta = { yaw: 0, pitch: 0 };

export function addLook(yaw: number, pitch: number) {
  lookDelta.yaw += yaw;
  lookDelta.pitch += pitch;
}

export function consumeLook(): { yaw: number; pitch: number } {
  const out = { yaw: lookDelta.yaw, pitch: lookDelta.pitch };
  lookDelta.yaw = 0;
  lookDelta.pitch = 0;
  return out;
}

/** Browser key mapping, used by the web build of the keyboard host. */
export function keyForWeb(key: string, code: string): LogicalKey | null {
  switch (code) {
    case 'KeyW':
      return 'forward';
    case 'KeyS':
      return 'back';
    case 'KeyA':
      return 'strafeLeft';
    case 'KeyD':
      return 'strafeRight';
    case 'KeyQ':
      return 'turnLeft';
    case 'KeyE':
      return 'turnRight';
    case 'KeyF':
      return 'interact';
    case 'KeyM':
      return 'map';
    case 'KeyR':
      return 'lookUp';
    case 'KeyV':
      return 'lookDown';
    case 'ArrowUp':
      return 'forward';
    case 'ArrowDown':
      return 'back';
    case 'ArrowLeft':
      return 'turnLeft';
    case 'ArrowRight':
      return 'turnRight';
    case 'Space':
    case 'Enter':
      return 'interact';
    case 'Escape':
      return 'escape';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'run';
    default:
      break;
  }
  switch (key) {
    case ' ':
    case 'Enter':
      return 'interact';
    case 'Escape':
      return 'escape';
    case 'Shift':
      return 'run';
    default:
      return null;
  }
}
