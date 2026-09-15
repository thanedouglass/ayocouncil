"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouncilFanOut = void 0;
const councilSeats_1 = require("../../config/councilSeats");
const seatRouter_1 = require("./seatRouter");
/**
 * Orchestrates the concurrent fan-out to the Seven Council Seats.
 * Uses Promise.all() mapping over all seats with isolated per-seat timeout guarantees
 * and streams real-time `cot_delta` thoughts for transparent anti-dogma auditing.
 */
class CouncilFanOut {
    seats;
    seatRouter;
    constructor(seats = councilSeats_1.COUNCIL_SEATS, seatRouter = new seatRouter_1.SeatRouter(), onCotDelta) {
        this.seats = seats;
        this.seatRouter = seatRouter;
        if (onCotDelta) {
            this.seatRouter.setCotDeltaCallback(onCotDelta);
        }
    }
    setCotDeltaCallback(cb) {
        this.seatRouter.setCotDeltaCallback(cb);
    }
    /**
     * Dispatches the transcribed user input concurrently to all 7 council seats using Promise.all().
     * Each seat evaluates within its individual timeout budget.
     *
     * @param userSpeech Transcribed text from GPT-Live-1 audio stream.
     * @returns FanOutResult containing all 7 seat deliberations and quorum health status.
     */
    async fanOutDeliberation(userSpeech) {
        const fanOutStart = Date.now();
        console.log(`[CouncilFanOut] Initiating 7-seat fan-out for: "${userSpeech.slice(0, 60)}..."`);
        // Concurrent execution across all 7 seats via Promise.all
        const seatPromises = this.seats.map((seat) => this.seatRouter.executeSeatDeliberation(seat, userSpeech));
        const deliberations = await Promise.all(seatPromises);
        const totalLatencyMs = Date.now() - fanOutStart;
        const completed = deliberations.filter((d) => d.status === 'completed');
        const timedOut = deliberations.filter((d) => d.status === 'timed_out');
        const failed = deliberations.filter((d) => d.status === 'failed');
        const quorumReached = completed.length >= councilSeats_1.COUNCIL_QUORUM_THRESHOLD;
        console.log(`[CouncilFanOut] Fan-out finished in ${totalLatencyMs}ms. ` +
            `Completed: ${completed.length}/7, Timed Out: ${timedOut.length}, Failed: ${failed.length}. ` +
            `Quorum: ${quorumReached ? 'PASSED' : 'DEGRADED'}`);
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
exports.CouncilFanOut = CouncilFanOut;
