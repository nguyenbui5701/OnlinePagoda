import type { Seat } from '@vuonsen/shared';
// Presentation only: keep the engine's 100 seat IDs/FIFO, give rows more breathing room.
export function goldenSeat(seat: Seat): Seat { return seat.id.startsWith('standing-')?seat:{ ...seat, y: 1055 + Math.round((seat.y - 1110) / 73) * 80 }; }
