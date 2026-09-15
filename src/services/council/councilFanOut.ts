import { COUNCIL_QUORUM_THRESHOLD, COUNCIL_SEATS } from '../../config/councilSeats';
import { CouncilSeatConfig, SeatDeliberation } from '../../types/council';
import { CotDeltaCallback, SeatRouter } from './seatRouter';

export interface FanOutResult {
  deliberations: SeatDeliberation[];
  totalLatencyMs: number;
  completedCount: number;
  timedOutCount: number;
  failedCount: number;
  quorumReached: boolean;
}

/**
 * Orchestrates the concurrent fan-out to the Seven Council Seats.
 * Uses Promise.all() mapping over all seats with isolated per-seat timeout guarantees
 * and streams real-time `cot_delta` thoughts for transparent anti-dogma auditing.
 */
export class CouncilFanOut {
  private seats: CouncilSeatConfig[];
  private seatRouter: SeatRouter;

  constructor(
    seats: CouncilSeatConfig[] = COUNCIL_SEATS,
    seatRouter: SeatRouter = new SeatRouter(),
    onCotDelta?: CotDeltaCallback
  ) {
    this.seats = seats;
    this.seatRouter = seatRouter;
    if (onCotDelta) {
      this.seatRouter.setCotDeltaCallback(onCotDelta);
    }
  }

  public setCotDeltaCallback(cb: CotDeltaCallback) {
    this.seatRouter.setCotDeltaCallback(cb);
  }

  /**
   * Dispatches the transcribed user input concurrently to all 7 council seats using Promise.all().
   * Each seat evaluates within its individual timeout budget.
   *
   * @param userSpeech Transcribed text from GPT-Live-1 audio stream.
   * @returns FanOutResult containing all 7 seat deliberations and quorum health status.
   */
  public async fanOutDeliberation(userSpeech: string): Promise<FanOutResult> {
    const fanOutStart = Date.now();
    console.log(`[CouncilFanOut] Initiating 7-seat fan-out for: "${userSpeech.slice(0, 60)}..."`);

    // Concurrent execution across all 7 seats via Promise.all
    const seatPromises = this.seats.map((seat) =>
      this.seatRouter.executeSeatDeliberation(seat, userSpeech)
    );

    const deliberations: SeatDeliberation[] = await Promise.all(seatPromises);

    const totalLatencyMs = Date.now() - fanOutStart;
    const completed = deliberations.filter((d) => d.status === 'completed');
    const timedOut = deliberations.filter((d) => d.status === 'timed_out');
    const failed = deliberations.filter((d) => d.status === 'failed');
    const quorumReached = completed.length >= COUNCIL_QUORUM_THRESHOLD;

    console.log(
      `[CouncilFanOut] Fan-out finished in ${totalLatencyMs}ms. ` +
        `Completed: ${completed.length}/7, Timed Out: ${timedOut.length}, Failed: ${failed.length}. ` +
        `Quorum: ${quorumReached ? 'PASSED' : 'DEGRADED'}`
    );

    return {
      deliberations,
      totalLatencyMs,
      completedCount: completed.length,
      timedOutCount: timedOut.length,
      failedCount: failed.length,
      quorumReached
    };
  }
}
