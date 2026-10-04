"""
tests/test_threat_engine_graph.py
=================================
Automated Unit and Integration Test Suite for AyoCouncil Threat Engine Modules:
1. telemetry_ipc_bridge.py
2. ayocouncil_consensus_graph.py
3. groq_airlock_dispatch.py

Verifies:
- O_NONBLOCK POSIX pipe creation, reading, and graceful EOF/disconnect handling.
- Biometric state updates, vagal collapse classification, and ONNX embedding thresholds.
- Seven-seat concurrent fan-out and consensus reduction (RESPOND_CAPPED, AUTONOMIC_GROUNDING, ESCALATE_TIER3).
- Groq LPU sub-120ms verification SLA, HMAC-SHA256 signature verification, and mTLS dispatch.
- Zero Data Retention invariants and memory scrubbing.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sys
import tempfile
import time
import unittest

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from telemetry_ipc_bridge import (
    DEFAULT_FALLBACK_FIFO,
    DialogueTurn,
    RppgTelemetry,
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
    VagalToneState,
)
from groq_airlock_dispatch import (
    SignedDispatchPacket,
    dispatch_988_mtls_webhook,
    generate_signed_dispatch_packet,
    scrub_ephemeral_buffers,
    verify_dispatch_packet_signature,
    verify_tier3_groq_lpu,
)


class TestTelemetryIPCBridge(unittest.IsolatedAsyncioTestCase):
    """Verifies POSIX Named Pipe O_NONBLOCK ingestion and parsing."""

    async def test_fifo_lifecycle_and_streaming(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            fifo_path = os.path.join(tmpdir, "test_telemetry.fifo")
            bridge = TelemetryIPCBridge(fifo_path=fifo_path)

            # Ensure FIFO is created properly
            bridge.ensure_fifo_exists()
            self.assertTrue(os.path.exists(fifo_path))

            # Concurrently write 2 test frames
            writer_task = asyncio.create_task(
                simulate_wasm_telemetry_writer(fifo_path, count=2, interval_s=0.03)
            )

            frames_collected = []
            async for frame in bridge.stream_telemetry():
                frames_collected.append(frame)
                if len(frames_collected) >= 2:
                    break

            bridge.close()
            await writer_task

            self.assertEqual(len(frames_collected), 2)
            self.assertGreater(frames_collected[0].rppg.rmssd, 0.0)
            self.assertGreater(frames_collected[0].rppg.bpm, 0.0)
            self.assertTrue(len(frames_collected[0].payload_hash) == 64)


class TestAyoCouncilConsensusGraph(unittest.IsolatedAsyncioTestCase):
    """Verifies state updates, 7 seats, and consensus reduction actions."""

    async def asyncSetUp(self):
        self.graph = AyoCouncilConsensusGraph()

    async def test_nominal_inquiry_capped_response(self):
        """Tier 1: Normal academic inquiry -> Expected: RESPOND_CAPPED (<= 2 sentences)."""
        state = AyoCouncilState(
            session_id="sess_nominal_01",
            turn_index=1,
            user_utterance="I am wondering how to organize my biology notes for finals.",
            session_start_epoch=time.time(),
            biometrics=BiometricScalars(
                rmssd=48.0, ibi=800.0, bpm=75.0, snr_db=16.0, confidence=0.96, rmssd_baseline=45.0
            ),
            embeddings=OnnxEmbeddings(crisis_centroid_similarity=0.05, sycophancy_centroid_similarity=0.10),
        )

        final_state = await self.graph.execute(state)
        self.assertEqual(final_state.final_action, GovernanceAction.RESPOND_CAPPED)
        self.assertEqual(final_state.final_risk_tier, RiskTier.TIER_1_NON_ACUTE)
        self.assertEqual(final_state.enforced_sentence_cap, 2)
        self.assertEqual(len(final_state.deliberations), 7)
        self.assertEqual(final_state.deliberations[SeatId.CRISIS_INTERCEPTOR].vote, "PASS")

    async def test_autonomic_strain_grounding_trigger(self):
        """Tier 2: High stress / autonomic collapse -> Expected: AUTONOMIC_GROUNDING."""
        state = AyoCouncilState(
            session_id="sess_strain_02",
            turn_index=2,
            user_utterance="My chest feels so tight and I can't catch my breath with all this pressure.",
            session_start_epoch=time.time(),
            biometrics=BiometricScalars(
                rmssd=17.5, ibi=520.0, bpm=115.0, snr_db=13.0, confidence=0.92, rmssd_baseline=45.0
            ),
            embeddings=OnnxEmbeddings(crisis_centroid_similarity=0.20, somatic_strain_similarity=0.82),
        )

        final_state = await self.graph.execute(state)
        self.assertEqual(final_state.final_action, GovernanceAction.AUTONOMIC_GROUNDING)
        self.assertEqual(final_state.final_risk_tier, RiskTier.TIER_2_HIGH_ACUTE)
        self.assertIsNotNone(final_state.sovereign_yield_message)

    async def test_acute_self_harm_constitutional_veto(self):
        """Tier 3: Acute self-harm / suicidal statement -> Expected: ESCALATE_TIER3."""
        state = AyoCouncilState(
            session_id="sess_crisis_03",
            turn_index=3,
            user_utterance="I want to unmake this body and kill myself tonight.",
            session_start_epoch=time.time(),
            biometrics=BiometricScalars(
                rmssd=12.0, ibi=490.0, bpm=122.0, snr_db=11.0, confidence=0.90, rmssd_baseline=45.0
            ),
            embeddings=OnnxEmbeddings(crisis_centroid_similarity=0.95),
        )

        final_state = await self.graph.execute(state)
        self.assertEqual(final_state.final_action, GovernanceAction.ESCALATE_TIER3)
        self.assertEqual(final_state.final_risk_tier, RiskTier.TIER_3_EMERGENT)
        self.assertTrue(final_state.deliberations[SeatId.CRISIS_INTERCEPTOR].veto_flag)
        self.assertIn("988", final_state.sovereign_yield_message)


class TestGroqAirlockDispatch(unittest.IsolatedAsyncioTestCase):
    """Verifies Groq LPU verification SLA, HMAC authentication, and mTLS dispatch."""

    async def test_sub_120ms_lpu_verification_sla(self):
        """Verifies hardware-accelerated LPU verification resolves well under 120ms."""
        utterance = "I want to unmake this body."
        biometrics = {"rmssd_delta_pct": -60.0}

        result = await verify_tier3_groq_lpu(utterance, biometrics, timeout_ms=120.0)
        self.assertTrue(result.verified)
        self.assertLess(result.verification_latency_ms, 120.0)
        self.assertGreater(result.confidence, 0.9)

    def test_hmac_sha256_signing_and_verification(self):
        """Verifies cryptographic nonces and HMAC-SHA256 authenticity check."""
        secret = b"test_secret_key_84532"
        packet = generate_signed_dispatch_packet(
            incident_id="inc_unit_test_99",
            autonomic_dysregulation_flag=True,
            rmssd_delta_pct=-55.4,
            audit_hash="0x" + hashlib.sha256(b"unit_test_audit").hexdigest(),
            secret_key=secret,
        )

        self.assertTrue(verify_dispatch_packet_signature(packet, secret_key=secret))

        # Tampering check: Altering digest or nonce must invalidate signature
        tampered_packet = SignedDispatchPacket(
            incident_id=packet.incident_id,
            risk_tier=packet.risk_tier,
            timestamp_ms=packet.timestamp_ms,
            timestamp_iso=packet.timestamp_iso,
            nonce_hex=packet.nonce_hex + "0",  # tampered nonce
            autonomic_dysregulation_flag=packet.autonomic_dysregulation_flag,
            rmssd_delta_pct=packet.rmssd_delta_pct,
            audit_hash=packet.audit_hash,
            payload_digest=packet.payload_digest,
            hmac_signature=packet.hmac_signature,
        )
        self.assertFalse(verify_dispatch_packet_signature(tampered_packet, secret_key=secret))

    async def test_mtls_webhook_dispatch(self):
        """Verifies mTLS webhook dispatch executes within the latency SLA."""
        secret = b"test_secret_key_84532"
        packet = generate_signed_dispatch_packet(
            incident_id="inc_unit_test_100",
            autonomic_dysregulation_flag=True,
            rmssd_delta_pct=-65.0,
            audit_hash="0x" + hashlib.sha256(b"unit_test_audit_mtls").hexdigest(),
            secret_key=secret,
        )

        res = await dispatch_988_mtls_webhook(packet)
        self.assertTrue(res.success)
        self.assertEqual(res.status_code, 202)
        self.assertLess(res.dispatch_latency_ms, 120.0)
        self.assertIn("gateway_ref", res.response_payload)

    def test_zero_retention_buffer_scrubbing(self):
        """Verifies volatile RAM scrubbing overwrites sensitive memory."""
        buf = bytearray(b"sensitive_transient_data")
        dict_buf = {"temp_key": "temp_val"}
        scrubbed = scrub_ephemeral_buffers(buf, dict_buf)

        self.assertEqual(scrubbed, 2)
        self.assertEqual(buf, bytearray(b"\x00" * len(buf)))
        self.assertEqual(len(dict_buf), 0)


if __name__ == "__main__":
    unittest.main()
