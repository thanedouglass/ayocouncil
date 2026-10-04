"""
threat_engine_pipeline.py
=========================
End-to-End Orchestrator Pipeline for the AyoCouncil Threat Engine.

Integrates the three core architectural modules:
1. TelemetryIPCBridge (`telemetry_ipc_bridge.py`)
2. AyoCouncilConsensusGraph (`ayocouncil_consensus_graph.py`)
3. GroqAirlockDispatch (`groq_airlock_dispatch.py`)

Workflow:
- Ingests non-blocking WASM rPPG telemetry scalars (RMSSD, IBI) and text tokens from the POSIX FIFO.
- Updates autonomic states and dispatches concurrently to the 7 specialized governance seats.
- Reduces consensus to bounded deterministic actions (RESPOND_CAPPED, AUTONOMIC_GROUNDING, NUDGE_OFFLINE_MENTOR, ESCALATE_TIER3).
- On ESCALATE_TIER3: Immediately executes secondary verification on Groq LPUs (<120ms SLA),
  constructs an HMAC-SHA256 signed zero-PII packet, and dispatches via mTLS to the 988 emergency gateway.
- Enforces Zero Data Retention (ZDR) by purging volatile buffers in RAM after every cycle.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import time
from typing import Optional

from telemetry_ipc_bridge import (
    DEFAULT_FALLBACK_FIFO,
    DEFAULT_PRIMARY_FIFO,
    TelemetryFrame,
    TelemetryIPCBridge,
    simulate_wasm_telemetry_writer,
)
from ayocouncil_consensus_graph import (
    AyoCouncilConsensusGraph,
    AyoCouncilState,
    BiometricScalars,
    GovernanceAction,
    OnnxEmbeddings,
    RiskTier,
    SeatId,
)
from groq_airlock_dispatch import (
    SignedDispatchPacket,
    dispatch_988_mtls_webhook,
    generate_signed_dispatch_packet,
    scrub_ephemeral_buffers,
    verify_dispatch_packet_signature,
    verify_tier3_groq_lpu,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AyoCouncil.Pipeline] %(message)s",
    stream=sys.stderr,
)
logger: logging.Logger = logging.getLogger("ayocouncil.pipeline")


class ThreatEnginePipeline:
    """
    Unified AyoCouncil Threat Engine Controller.
    """

    def __init__(self, fifo_path: Optional[str] = None) -> None:
        self.bridge = TelemetryIPCBridge(fifo_path=fifo_path)
        self.graph = AyoCouncilConsensusGraph()
        self._running = False

    async def run(self, max_frames: Optional[int] = None) -> None:
        """
        Runs the continuous event-driven processing loop over the POSIX named pipe.
        """
        self._running = True
        logger.info(
            "Starting Threat Engine Pipeline listening on POSIX FIFO '%s'...",
            self.bridge.active_fifo_path,
        )

        frames_processed = 0
        try:
            async for frame in self.bridge.stream_telemetry():
                frames_processed += 1
                await self.process_frame(frame)
                if max_frames and frames_processed >= max_frames:
                    break
        finally:
            self.bridge.close()
            logger.info("Threat Engine Pipeline terminated cleanly.")

    async def process_frame(self, frame: TelemetryFrame) -> AyoCouncilState:
        """
        Processes a single TelemetryFrame through the 7-seat consensus graph
        and handles Tier 3 Groq verification / 988 emergency egress if required.
        """
        turn_start = time.perf_counter()

        # Step 1: Map incoming telemetry to the graph state
        biometrics = BiometricScalars(
            rmssd=frame.rppg.rmssd,
            ibi=frame.rppg.ibi,
            bpm=frame.rppg.bpm,
            snr_db=frame.rppg.snr_db,
            confidence=frame.rppg.confidence,
            skin_tone_fitzpatrick=frame.rppg.skin_tone_fitzpatrick,
        )

        # In production, ONNX embeddings are computed locally via sentence-transformers/all-MiniLM-L6-v2 (<12ms)
        # Here we seed cosine distance based on keyword scanning for local zero-dependency operation
        text_lower = frame.dialogue.text_tokens.lower()
        is_crisis_query = any(k in text_lower for k in ["unmake this body", "kill myself", "end my life", "suicide"])
        embeddings = OnnxEmbeddings(
            crisis_centroid_similarity=0.94 if is_crisis_query else 0.05,
            sycophancy_centroid_similarity=0.15,
        )

        initial_state = AyoCouncilState(
            session_id=frame.dialogue.session_id,
            turn_index=frame.dialogue.turn_index,
            user_utterance=frame.dialogue.text_tokens,
            session_start_epoch=time.time(),
            biometrics=biometrics,
            embeddings=embeddings,
        )

        # Step 2: Deliberate across the 7 seats and reduce consensus
        state = await self.graph.execute(initial_state)

        # Step 3: Handle Terminal Action
        if state.final_action == GovernanceAction.ESCALATE_TIER3:
            logger.critical("TIER 3 ESCALATION TRIGGERED! Engaging Groq LPU Verifier & 988 Airlock...")
            await self._handle_tier3_emergency(state)
        elif state.final_action == GovernanceAction.AUTONOMIC_GROUNDING:
            logger.warning("AUTONOMIC GROUNDING ENGAGED: RMSSD dropped %.1f%%. Emitting sensory pause.", biometrics.rmssd_delta_pct)
        elif state.final_action == GovernanceAction.NUDGE_OFFLINE_MENTOR:
            logger.info("DEVELOPMENTAL PACING ENGAGED: Emitting offline mentor handoff.")
        else:
            logger.info("RESPOND_CAPPED ENGAGED: Safe turn. Response enforced to <= %d sentences.", state.enforced_sentence_cap)

        total_latency_ms = (time.perf_counter() - turn_start) * 1000.0
        logger.info(
            "Frame [%s] complete in %.2f ms | Action: %s | Risk: %s",
            frame.frame_id,
            total_latency_ms,
            state.final_action.value if state.final_action else "NONE",
            state.final_risk_tier.value,
        )

        # Step 4: Zero Data Retention Volatile Memory Scrub
        scrub_ephemeral_buffers(state.deliberations)

        return state

    async def _handle_tier3_emergency(self, state: AyoCouncilState) -> None:
        """
        Executes sub-120ms secondary verification on Groq LPU, generates signed packet,
        and dispatches mutual-TLS webhook to 988.
        """
        biometric_context = {
            "rmssd_delta_pct": state.biometrics.rmssd_delta_pct,
            "bpm": state.biometrics.bpm,
        }

        # 1. Hardware-accelerated LPU verification
        verif = await verify_tier3_groq_lpu(state.user_utterance, biometric_context)
        if not verif.verified:
            logger.warning("Secondary Groq LPU verifier did not confirm acute emergency. Escalation downgraded.")
            return

        # 2. Cryptographic packet signing (Zero PII)
        incident_id = f"inc_{state.session_id}_{int(time.time() * 1000)}"
        signed_packet = generate_signed_dispatch_packet(
            incident_id=incident_id,
            autonomic_dysregulation_flag=(state.biometrics.rmssd_delta_pct <= -25.0),
            rmssd_delta_pct=state.biometrics.rmssd_delta_pct,
            audit_hash=state.audit_hash,
        )

        # 3. mTLS Webhook dispatch to 988 Lifeline
        dispatch_res = await dispatch_988_mtls_webhook(signed_packet)
        if dispatch_res.success:
            logger.info("988 mTLS Dispatch confirmed: GatewayRef=%s", dispatch_res.response_payload.get("gateway_ref"))
        else:
            logger.critical("988 mTLS Dispatch failed! Local emergency on-site protocol engaged.")


async def main() -> None:
    """
    Demonstrates the full end-to-end pipeline processing synthetic WASM telemetry frames.
    """
    print("=" * 75)
    print("AYOCOUNCIL THREAT ENGINE: END-TO-END PIPELINE DEMONSTRATION")
    print("=" * 75)

    pipeline = ThreatEnginePipeline()

    # Start synthetic WASM writer emitting 3 representative frames:
    # Frame 1: Nominal inquiry
    # Frame 2: Rising autonomic stress
    # Frame 3: Acute emergent crisis statement
    writer_task = asyncio.create_task(
        simulate_wasm_telemetry_writer(pipeline.bridge.active_fifo_path, count=3, interval_s=0.1)
    )

    # Process exactly 3 frames then terminate
    await pipeline.run(max_frames=3)
    await writer_task

    print("=" * 75)
    print("END-TO-END DEMO COMPLETED SUCCESSFULLY.")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(main())
