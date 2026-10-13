"""Unit tests for the local EmbeddingGemma service without model downloads."""

from __future__ import annotations

import importlib
import sys
from types import ModuleType, SimpleNamespace

import numpy as np
import pytest


@pytest.fixture
def embedding_module(monkeypatch):
    """Load the module with lightweight dependency doubles."""

    torch = SimpleNamespace(
        bfloat16="bfloat16",
        float32="float32",
        cuda=SimpleNamespace(is_bf16_supported=lambda: True, is_available=lambda: True),
    )
    monkeypatch.setitem(sys.modules, "torch", torch)
    transformers = ModuleType("transformers")
    transformers.AutoConfig = SimpleNamespace(
        from_pretrained=lambda _: SimpleNamespace(hidden_size=768)
    )
    monkeypatch.setitem(sys.modules, "transformers", transformers)
    sentence_transformers = ModuleType("sentence_transformers")
    sentence_transformers.SentenceTransformer = object
    monkeypatch.setitem(sys.modules, "sentence_transformers", sentence_transformers)
    sys.modules.pop("server.services.embeddingGemmaService", None)
    return importlib.import_module("server.services.embeddingGemmaService")


def test_task_wrappers_use_asymmetric_and_symmetric_prefixes(embedding_module):
    assert embedding_module.wrap_asymmetric(
        "What is the policy?", embedding_module.EmbeddingTask.QUESTION_ANSWERING
    ) == "task: question answering | query: What is the policy?"
    assert embedding_module.wrap_symmetric(
        "A statement", embedding_module.EmbeddingTask.SENTENCE_SIMILARITY
    ) == "task: sentence similarity | query: A statement"


def test_encode_truncates_and_normalizes(embedding_module):
    class FakeModel:
        def __init__(self):
            self.calls = []

        def encode(self, values, **kwargs):
            self.calls.append((values, kwargs))
            return np.ones((len(values), 128), dtype=np.float32)

    model = FakeModel()
    service = embedding_module.EmbeddingGemmaService(model=model, dimension=128)
    service.encode("local prompt")
    assert model.calls[0][0] == ["task: search result | query: local prompt"]
    assert model.calls[0][1]["truncate_dim"] == 128
    assert model.calls[0][1]["normalize_embeddings"] is True


def test_model_loading_uses_bfloat16_when_supported(embedding_module):
    captured = {}

    class FakeSentenceTransformer:
        def __init__(self, model_name, **kwargs):
            captured["model_name"] = model_name
            captured.update(kwargs)

    embedding_module.SentenceTransformer = FakeSentenceTransformer
    embedding_module.EmbeddingGemmaService._load_model("google/embeddinggemma-2")
    assert captured["model_kwargs"]["torch_dtype"] == "bfloat16"
    assert captured["model_kwargs"]["torch_dtype"] != "float16"


def test_route_selects_council_or_elegba_without_network(embedding_module):
    class FakeService(embedding_module.EmbeddingGemmaService):
        def encode(self, texts, **kwargs):
            if isinstance(texts, str):
                return np.array([[1.0, 0.0]], dtype=np.float32)
            return np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)

    service = FakeService(model=object(), dimension=128, threshold=0.72)
    assert service.route("deliberate this").route == "full_council"

    class ElegbaService(FakeService):
        def encode(self, texts, **kwargs):
            if isinstance(texts, str):
                return np.array([[0.0, 1.0]], dtype=np.float32)
            return super().encode(texts, **kwargs)

    assert ElegbaService(model=object(), dimension=128).route("challenge this").route == (
        "elegba_stress_test"
    )
