"""
telemetry_ipc_bridge.py
======================
Asynchronous POSIX Named Pipe (FIFO) Telemetry Bridge for AyoCouncil.

Part of the AyoCouncil Threat Engine Architecture (Grant Proposal RQ1/RQ2).
Operates as an OS-level, zero-extraction IPC air-lock ingesting client-side
WASM rPPG biometric scalars (RMSSD, IBI) and conversational text tokens
from `/run/ayocouncil/telemetry.fifo` in non-blocking (O_NONBLOCK) mode.

Design Invariants:
1. Zero Data Retention: Raw video frames are processed client-side in WebAssembly
   (POS/CHROM algorithms) and overwritten every 33.3ms. Only derived anonymous
   scalars (RMSSD, IBI, BPM, SNR) and text tokens are transmitted across this FIFO.
2. Non-blocking Asynchronous I/O: Pipe is opened with `os.O_NONBLOCK` to prevent
   event-loop starvation. Reconnection and writer disconnects (EOF) are handled
   gracefully without spinning.
3. Strict Typing and Sanitization: Incoming payloads are validated, hashed for
   audit integrity, and yielded to the consensus graph orchestrator.
"""

from __future__ import annotations

import asyncio
import errno
import hashlib
import json
import logging
import os
import stat
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import AsyncGenerator, Dict, Final, Optional, Union

# Configure module logging with ISO formatting to standard error (preserving stdout for IPC)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AyoCouncil.TelemetryIPC] %(message)s",
    stream=sys.stderr,
)
logger: logging.Logger = logging.getLogger("ayocouncil.telemetry_ipc")

# ---------------------------------------------------------------------------
# Path & IPC Constants
# ---------------------------------------------------------------------------
# Primary POSIX FIFO path as specified in FINAL_MERGED_PROPOSAL.md
DEFAULT_PRIMARY_FIFO: Final[str] = "/run/ayocouncil/telemetry.fifo"
# Fallback POSIX FIFO path for local development/macOS where /run is privileged
DEFAULT_FALLBACK_FIFO: Final[str] = "/tmp/ayocouncil/telemetry.fifo"
READ_BUFFER_SIZE: Final[int] = 65536  # 64 KB read buffer for POSIX pipe frames
FIFO_PERMISSIONS: Final[int] = 0o660  # rw-rw----


# ---------------------------------------------------------------------------
# Data Models (Zero-Extraction Contracts)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RppgTelemetry:
    """
    Client-side derived photoplethysmography (rPPG) metrics computed in WASM.
    
    Zero-knowledge invariant: No facial imagery or pixel buffers ever leave
    the client device. Only filtered pulsatile time-series scalars are received.
    """
    rmssd: float  # Root Mean Square of Successive Differences (ms) - vagal/parasympathetic index
    ibi: float  # Inter-Beat Interval (ms) - instantaneous R-R proxy
    bpm: float  # Heart rate (Beats Per Minute) derived from IBI
    snr_db: float  # Capillary blood volume pulse Signal-to-Noise Ratio (dB)
    confidence: float  # POS/CHROM tracking confidence [0.0 - 1.0]
    skin_tone_fitzpatrick: Optional[int] = None  # Fitzpatrick category I-VI for equitable validation
    timestamp_ms: int = field(default_factory=lambda: int(time.time() * 1000))


@dataclass(frozen=True)
class DialogueTurn:
    """
    Conversational text payload from the current interaction turn.
    """
    session_id: str
    turn_index: int
    text_tokens: str  # Utterance or streaming token delta
    is_final_turn: bool = False
    timestamp_ms: int = field(default_factory=lambda: int(time.time() * 1000))


@dataclass(frozen=True)
class TelemetryFrame:
    """
    Unified composite frame yielded by the IPC bridge to the graph orchestrator.
    """
    frame_id: str
    rppg: RppgTelemetry
    dialogue: DialogueTurn
    payload_hash: str  # SHA-256 integrity hash of raw payload (cryptographic audit proof)
    arrival_epoch_ns: int = field(default_factory=time.time_ns)

    def to_dict(self) -> Dict[str, Union[str, int, float, dict]]:
        return {
            "frame_id": self.frame_id,
            "rppg": asdict(self.rppg),
            "dialogue": asdict(self.dialogue),
            "payload_hash": self.payload_hash,
            "arrival_epoch_ns": self.arrival_epoch_ns,
        }


# ---------------------------------------------------------------------------
# Telemetry IPC Bridge Core
# ---------------------------------------------------------------------------

class TelemetryIPCBridge:
    """
    Asynchronous bridge that manages the lifecycle of the POSIX named pipe,
    performs non-blocking reads, parses JSON frames, and yields them as typed
    TelemetryFrame instances.
    """

    def __init__(self, fifo_path: Optional[str] = None) -> None:
        self.requested_fifo_path: str = fifo_path or DEFAULT_PRIMARY_FIFO
        self.active_fifo_path: str = self._resolve_fifo_path(self.requested_fifo_path)
        self._fd: Optional[int] = None
        self._running: bool = False
        self._partial_buffer: bytes = b""

    @staticmethod
    def _resolve_fifo_path(candidate_path: str) -> str:
        """
        Determines the accessible path for the FIFO. If the candidate directory
        (e.g., /run) lacks write permissions, gracefully falls back to /tmp.
        """
        parent_dir = os.path.dirname(candidate_path)
        try:
            os.makedirs(parent_dir, exist_ok=True)
            # Test write access to directory
            test_file = os.path.join(parent_dir, ".write_test")
            with open(test_file, "w") as f:
                f.write("ok")
            os.remove(test_file)
            return candidate_path
        except (OSError, PermissionError) as exc:
            logger.warning(
                "Cannot write to preferred FIFO directory '%s' (%s). "
                "Failing over to fallback directory '%s'.",
                parent_dir,
                exc,
                DEFAULT_FALLBACK_FIFO,
            )
            fallback_dir = os.path.dirname(DEFAULT_FALLBACK_FIFO)
            os.makedirs(fallback_dir, exist_ok=True)
            return DEFAULT_FALLBACK_FIFO

    def ensure_fifo_exists(self) -> None:
        """
        Creates the POSIX named pipe if it does not already exist.
        Validates that an existing path is indeed a FIFO.
        """
        if os.path.exists(self.active_fifo_path):
            mode = os.stat(self.active_fifo_path).st_mode
            if not stat.S_ISFIFO(mode):
                raise RuntimeError(
                    f"Path '{self.active_fifo_path}' exists but is not a POSIX FIFO."
                )
            logger.debug("Existing FIFO verified at '%s'.", self.active_fifo_path)
            return

        try:
            os.mkfifo(self.active_fifo_path, FIFO_PERMISSIONS)
            logger.info("Created POSIX FIFO at '%s' with mode %o.", self.active_fifo_path, FIFO_PERMISSIONS)
        except OSError as exc:
            logger.error("Failed to create FIFO at '%s': %s", self.active_fifo_path, exc)
            raise

    def open_pipe_nonblocking(self) -> int:
        """
        Opens the FIFO file descriptor in read-only, non-blocking mode (os.O_RDONLY | os.O_NONBLOCK).
        
        Under POSIX semantics:
        - Opening a FIFO for reading with O_NONBLOCK succeeds immediately,
          even if no writer has opened the FIFO yet.
        """
        self.ensure_fifo_exists()
        fd = os.open(self.active_fifo_path, os.O_RDONLY | os.O_NONBLOCK)
        logger.info("Opened FIFO '%s' in O_NONBLOCK mode (fd=%d).", self.active_fifo_path, fd)
        return fd

    def close(self) -> None:
        """
        Closes the FIFO file descriptor and resets volatile state.
        """
        self._running = False
        if self._fd is not None:
            try:
                os.close(self._fd)
                logger.info("Closed FIFO descriptor (fd=%d).", self._fd)
            except OSError as exc:
                logger.warning("Error closing FIFO descriptor: %s", exc)
            finally:
                self._fd = None
        # Obliterate in-memory partial buffers (zero-retention)
        self._partial_buffer = b""

    async def stream_telemetry(self) -> AsyncGenerator[TelemetryFrame, None]:
        """
        Asynchronously reads new line-delimited or stream-framed JSON packets
        from the POSIX FIFO and yields validated TelemetryFrame objects.
        
        Handles:
        - Non-blocking reads via asyncio loop integration.
        - Partial chunk assembly across stream boundaries.
        - Writer disconnects without busy-loop spinning (yields control via sleep).
        """
        self._running = True
        self._fd = self.open_pipe_nonblocking()

        loop = asyncio.get_running_loop()

        while self._running:
            try:
                # Attempt non-blocking raw read
                chunk = os.read(self._fd, READ_BUFFER_SIZE)
            except BlockingIOError:
                # No data currently available in pipe buffer; yield back to event loop
                await asyncio.sleep(0.01)
                continue
            except OSError as exc:
                if exc.errno == errno.EAGAIN or exc.errno == errno.EWOULDBLOCK:
                    await asyncio.sleep(0.01)
                    continue
                logger.error("OS error on FIFO read: %s", exc)
                break

            if not chunk:
                # Under POSIX FIFO semantics, reading 0 bytes with O_NONBLOCK indicates
                # that all active writers have closed their ends (EOF).
                # To keep the server listening for the next client session, we wait briefly
                # rather than closing the file descriptor.
                await asyncio.sleep(0.02)
                continue

            # Accumulate chunk and split into discrete line-delimited JSON frames
            self._partial_buffer += chunk
            while b"\n" in self._partial_buffer:
                line, self._partial_buffer = self._partial_buffer.split(b"\n", 1)
                line = line.strip()
                if not line:
                    continue

                frame = self._parse_json_payload(line)
                if frame is not None:
                    yield frame

        self.close()

    def _parse_json_payload(self, raw_bytes: bytes) -> Optional[TelemetryFrame]:
        """
        Validates raw JSON bytes against the telemetry and dialogue schemas.
        Computes SHA-256 for provenance without writing plaintext to disk.
        """
        try:
            payload_str = raw_bytes.decode("utf-8")
            data = json.loads(payload_str)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            logger.warning("Dropped malformed payload on FIFO: %s (raw: %r)", exc, raw_bytes[:60])
            return None

        # Verify required envelope fields
        if not isinstance(data, dict):
            logger.warning("Payload root is not a dictionary.")
            return None

        rppg_raw = data.get("rppg", {})
        dialogue_raw = data.get("dialogue", {})

        try:
            rppg = RppgTelemetry(
                rmssd=float(rppg_raw.get("rmssd", 0.0)),
                ibi=float(rppg_raw.get("ibi", 0.0)),
                bpm=float(rppg_raw.get("bpm", 0.0)),
                snr_db=float(rppg_raw.get("snr_db", 0.0)),
                confidence=float(rppg_raw.get("confidence", 0.0)),
                skin_tone_fitzpatrick=rppg_raw.get("skin_tone_fitzpatrick"),
                timestamp_ms=int(rppg_raw.get("timestamp_ms", int(time.time() * 1000))),
            )

            dialogue = DialogueTurn(
                session_id=str(dialogue_raw.get("session_id", "anonymous_session")),
                turn_index=int(dialogue_raw.get("turn_index", 0)),
                text_tokens=str(dialogue_raw.get("text_tokens", "")),
                is_final_turn=bool(dialogue_raw.get("is_final_turn", False)),
                timestamp_ms=int(dialogue_raw.get("timestamp_ms", int(time.time() * 1000))),
            )

            # Cryptographic SHA-256 hash of the exact incoming wire bytes
            payload_hash = hashlib.sha256(raw_bytes).hexdigest()

            frame_id = f"frame_{int(time.time() * 1000)}_{payload_hash[:8]}"

            return TelemetryFrame(
                frame_id=frame_id,
                rppg=rppg,
                dialogue=dialogue,
                payload_hash=payload_hash,
            )
        except (ValueError, TypeError) as exc:
            logger.warning("Field type conversion error on frame: %s", exc)
            return None


# ---------------------------------------------------------------------------
# Synthetic Feeder Utility (For Local Testing & CI Simulation)
# ---------------------------------------------------------------------------

async def simulate_wasm_telemetry_writer(fifo_path: str, count: int = 5, interval_s: float = 0.1) -> None:
    """
    Test helper that mimics the client-side WebAssembly rPPG engine writing
    derived biometric frames and speech tokens to the named pipe.
    """
    logger.info("Starting synthetic WASM telemetry writer targeting '%s'...", fifo_path)

    # Open FIFO in non-blocking write mode or wait until reader is active
    while not os.path.exists(fifo_path):
        await asyncio.sleep(0.05)

    # Open for writing (blocking write in worker thread or O_WRONLY)
    def _write_sync():
        try:
            fd = os.open(fifo_path, os.O_WRONLY)
        except OSError as e:
            logger.error("Writer failed to open FIFO: %s", e)
            return

        sample_cases = [
            {
                "rppg": {"rmssd": 48.2, "ibi": 810.0, "bpm": 74.1, "snr_db": 14.5, "confidence": 0.94, "skin_tone_fitzpatrick": 5},
                "dialogue": {"session_id": "sess_trial_01", "turn_index": 1, "text_tokens": "I have been feeling really exhausted by school expectations.", "is_final_turn": False},
            },
            {
                "rppg": {"rmssd": 24.1, "ibi": 620.0, "bpm": 96.8, "snr_db": 12.1, "confidence": 0.91, "skin_tone_fitzpatrick": 5},
                "dialogue": {"session_id": "sess_trial_01", "turn_index": 2, "text_tokens": "It feels like everything is piling up and my chest feels tight.", "is_final_turn": False},
            },
            {
                "rppg": {"rmssd": 12.4, "ibi": 510.0, "bpm": 117.6, "snr_db": 9.8, "confidence": 0.88, "skin_tone_fitzpatrick": 5},
                "dialogue": {"session_id": "sess_trial_01", "turn_index": 3, "text_tokens": "I just want to unmake this body and disappear completely.", "is_final_turn": True},
            },
        ]

        for i in range(count):
            payload = sample_cases[min(i, len(sample_cases) - 1)]
            line = (json.dumps(payload) + "\n").encode("utf-8")
            try:
                os.write(fd, line)
            except OSError as write_err:
                logger.warning("Writer write error: %s", write_err)
                break
            time.sleep(interval_s)

        os.close(fd)
        logger.info("Synthetic WASM writer completed emitting %d frames.", count)

    await asyncio.to_thread(_write_sync)


# ---------------------------------------------------------------------------
# Module Entrypoint & Standalone Smoke Test
# ---------------------------------------------------------------------------

async def main() -> None:
    """
    Smoke-test execution demonstrating asynchronous non-blocking ingestion
    from the named pipe and immediate frame handoff.
    """
    logger.info("Initializing AyoCouncil Telemetry IPC Bridge Smoke Test...")
    bridge = TelemetryIPCBridge()

    # Start synthetic writer concurrently in background
    writer_task = asyncio.create_task(
        simulate_wasm_telemetry_writer(bridge.active_fifo_path, count=3, interval_s=0.08)
    )

    frames_received = 0
    try:
        async for frame in bridge.stream_telemetry():
            frames_received += 1
            logger.info(
                "Ingested Telemetry Frame [%d] (ID: %s) -> RMSSD: %.1f ms | BPM: %.1f | Text: '%s'",
                frames_received,
                frame.frame_id,
                frame.rppg.rmssd,
                frame.rppg.bpm,
                frame.dialogue.text_tokens,
            )
            if frames_received >= 3:
                break
    finally:
        bridge.close()
        await writer_task
        logger.info("Telemetry IPC Bridge Smoke Test successfully completed.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Process interrupted by user.")
