"""Local EmbeddingGemma semantic routing for the AyoCouncil MCP server.

The model is loaded only when :class:`EmbeddingGemmaService` is instantiated.
This is intentional: importing the MCP module must not download model weights
or perform any network/data extraction.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Any, Callable, Sequence

try:
    import torch
except ImportError:  # pragma: no cover - exercised in dependency-free installs
    torch = None  # type: ignore[assignment]

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - exercised in dependency-free installs
    SentenceTransformer = None  # type: ignore[assignment,misc]

try:
    from transformers import AutoConfig
except ImportError:  # pragma: no cover - exercised in dependency-free installs
    AutoConfig = None  # type: ignore[assignment,misc]

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:  # pragma: no cover - makes unit imports dependency-free
    class FastMCP:  # type: ignore[no-redef]
        """Small import-time stand-in; real MCP is required when serving."""

        def __init__(self, name: str) -> None:
            self.name = name

        def tool(self, fn: Callable[..., Any]) -> Callable[..., Any]:
            return fn


MODEL_NAME = "google/embeddinggemma-2"
SUPPORTED_DIMENSIONS = (128, 256, 512, 768)
DEFAULT_DIMENSION = 768
DEFAULT_THRESHOLD = 0.72


class EmbeddingTask(str, Enum):
    """Task names used by EmbeddingGemma's task-aware prompt format."""

    SEARCH_QUERY = "search_query"
    QUESTION_ANSWERING = "question_answering"
    CLASSIFICATION = "classification"
    SENTENCE_SIMILARITY = "sentence_similarity"


def _task_prefix(task: EmbeddingTask) -> str:
    """Return Google's task prefix without appending user content."""

    task_names = {
        EmbeddingTask.SEARCH_QUERY: "search result",
        EmbeddingTask.QUESTION_ANSWERING: "question answering",
        EmbeddingTask.CLASSIFICATION: "classification",
        EmbeddingTask.SENTENCE_SIMILARITY: "sentence similarity",
    }
    return f"task: {task_names[task]} | "


def wrap_asymmetric(text: str, task: EmbeddingTask = EmbeddingTask.SEARCH_QUERY) -> str:
    """Format a query for an asymmetric task such as retrieval or QA."""

    if task not in (EmbeddingTask.SEARCH_QUERY, EmbeddingTask.QUESTION_ANSWERING):
        raise ValueError("Asymmetric wrappers only accept SEARCH_QUERY or QUESTION_ANSWERING")
    return f"{_task_prefix(task)}query: {text}"


def wrap_symmetric(text: str, task: EmbeddingTask) -> str:
    """Format text for symmetric classification or sentence similarity."""

    if task not in (EmbeddingTask.CLASSIFICATION, EmbeddingTask.SENTENCE_SIMILARITY):
        raise ValueError(
            "Symmetric wrappers only accept CLASSIFICATION or SENTENCE_SIMILARITY"
        )
    return f"{_task_prefix(task)}query: {text}"


def search_query(text: str) -> str:
    """Apply the SearchQuery prompt used for asymmetric retrieval queries."""

    return wrap_asymmetric(text, EmbeddingTask.SEARCH_QUERY)


def question_answering(text: str) -> str:
    """Apply the QuestionAnswering prompt used for QA queries."""

    return wrap_asymmetric(text, EmbeddingTask.QUESTION_ANSWERING)


def classification(text: str) -> str:
    """Apply the symmetric Classification prompt."""

    return wrap_symmetric(text, EmbeddingTask.CLASSIFICATION)


def sentence_similarity(text: str) -> str:
    """Apply the symmetric SentenceSimilarity prompt."""

    return wrap_symmetric(text, EmbeddingTask.SENTENCE_SIMILARITY)


def _validate_dimension(dimension: int) -> int:
    if dimension not in SUPPORTED_DIMENSIONS:
        raise ValueError(f"dimension must be one of {SUPPORTED_DIMENSIONS}, got {dimension}")
    return dimension


@dataclass(frozen=True)
class SemanticAirlockDecision:
    """Serializable routing result returned by the MCP tool."""

    route: str
    council_similarity: float
    elegba_similarity: float
    threshold: float
    dimension: int
    local_only: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "route": self.route,
            "council_similarity": self.council_similarity,
            "elegba_similarity": self.elegba_similarity,
            "threshold": self.threshold,
            "dimension": self.dimension,
            "local_only": self.local_only,
        }


class EmbeddingGemmaService:
    """On-device EmbeddingGemma encoder and semantic airlock."""

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        dimension: int = DEFAULT_DIMENSION,
        threshold: float = DEFAULT_THRESHOLD,
        model: Any | None = None,
    ) -> None:
        self.dimension = _validate_dimension(dimension)
        if not 0.0 <= threshold <= 1.0:
            raise ValueError("threshold must be between 0 and 1")
        self.threshold = threshold
        self.model_name = model_name
        self.model = model or self._load_model(model_name)

    @staticmethod
    def _load_model(model_name: str) -> Any:
        if torch is None or SentenceTransformer is None or AutoConfig is None:
            raise RuntimeError(
                "EmbeddingGemma requires torch, sentence-transformers, and transformers"
            )

        # Never select float16: it can silently produce NaNs on unsupported paths.
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32
        config = AutoConfig.from_pretrained(model_name)
        max_dimension = getattr(config, "hidden_size", DEFAULT_DIMENSION)
        if max_dimension < DEFAULT_DIMENSION:
            raise RuntimeError(
                f"{model_name} exposes {max_dimension} dimensions; "
                f"EmbeddingGemma requires at least {DEFAULT_DIMENSION}"
            )
        device = "cuda" if torch.cuda.is_available() else "cpu"
        return SentenceTransformer(
            model_name,
            device=device,
            model_kwargs={"torch_dtype": dtype},
        )

    def encode(
        self,
        texts: str | Sequence[str],
        *,
        task: EmbeddingTask = EmbeddingTask.SEARCH_QUERY,
        symmetric: bool = False,
        dimension: int | None = None,
    ) -> Any:
        """Encode locally with a task prefix and Matryoshka L2 normalization."""

        target_dimension = _validate_dimension(dimension or self.dimension)
        values = [texts] if isinstance(texts, str) else list(texts)
        if not values or any(not isinstance(value, str) or not value.strip() for value in values):
            raise ValueError("texts must contain at least one non-empty string")
        wrapped = [
            wrap_symmetric(value, task) if symmetric else wrap_asymmetric(value, task)
            for value in values
        ]
        return self.model.encode(
            wrapped,
            truncate_dim=target_dimension,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )

    def route(self, prompt: str, *, dimension: int | None = None) -> SemanticAirlockDecision:
        """Choose full council fan-out or the Elegba adversarial stress test."""

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("prompt must be a non-empty string")
        target_dimension = _validate_dimension(dimension or self.dimension)
        references = self.encode(
            [
                "A complex question requiring perspectives from all seven council seats.",
                "An adversarial challenge seeking blind spots, sycophancy, or contradictions.",
            ],
            task=EmbeddingTask.CLASSIFICATION,
            symmetric=True,
            dimension=target_dimension,
        )
        query = self.encode(
            prompt,
            task=EmbeddingTask.SEARCH_QUERY,
            dimension=target_dimension,
        )[0]
        similarities = references @ query
        council_similarity = float(similarities[0])
        elegba_similarity = float(similarities[1])
        route = (
            "full_council"
            if council_similarity >= self.threshold and council_similarity >= elegba_similarity
            else "elegba_stress_test"
        )
        return SemanticAirlockDecision(
            route=route,
            council_similarity=council_similarity,
            elegba_similarity=elegba_similarity,
            threshold=self.threshold,
            dimension=target_dimension,
        )


mcp = FastMCP("AyoCouncil EmbeddingGemma")


@lru_cache(maxsize=1)
def _default_service() -> EmbeddingGemmaService:
    return EmbeddingGemmaService()


@mcp.tool
def local_semantic_airlock(
    prompt: str,
    dimension: int = DEFAULT_DIMENSION,
    threshold: float = DEFAULT_THRESHOLD,
) -> dict[str, Any]:
    """Route a prompt locally without transmitting its contents off-device."""

    service = _default_service()
    if threshold != service.threshold:
        service = EmbeddingGemmaService(dimension=dimension, threshold=threshold)
    decision = service.route(prompt, dimension=dimension)
    return decision.as_dict()


__all__ = [
    "EmbeddingGemmaService",
    "EmbeddingTask",
    "SUPPORTED_DIMENSIONS",
    "local_semantic_airlock",
    "mcp",
    "classification",
    "question_answering",
    "search_query",
    "sentence_similarity",
    "wrap_asymmetric",
    "wrap_symmetric",
]
