"""
Tests for request model validation (no server needed).
"""

import pytest
from pydantic import ValidationError
from main import AnalyzeRequest, TranscribeRequest


class TestAnalyzeRequestValidation:
    def _valid(self, **overrides):
        base = dict(
            social_media_text="Flash flood in G-10 Islamabad, water rising fast",
            weather_location="Islamabad",
            traffic_location="G-10",
        )
        return AnalyzeRequest(**{**base, **overrides})

    def test_valid_request_passes(self):
        req = self._valid()
        assert req.social_media_text.startswith("Flash")

    def test_text_too_short_raises(self):
        with pytest.raises(ValidationError, match="at least 5"):
            self._valid(social_media_text="hi")

    def test_text_too_long_raises(self):
        with pytest.raises(ValidationError, match="5000"):
            self._valid(social_media_text="x" * 5001)

    def test_empty_location_raises(self):
        with pytest.raises(ValidationError):
            self._valid(weather_location="")

    def test_location_too_long_raises(self):
        with pytest.raises(ValidationError, match="200"):
            self._valid(weather_location="A" * 201)

    def test_invalid_language_raises(self):
        with pytest.raises(ValidationError, match="language"):
            self._valid(language="fr")

    def test_valid_ur_language(self):
        req = self._valid(language="ur")
        assert req.language == "ur"

    def test_image_size_limit(self):
        # >5MB base64 should fail
        big_image = "A" * (5 * 1024 * 1024 * 4 // 3 + 100)
        with pytest.raises(ValidationError, match="5 MB"):
            self._valid(image_base64=big_image)

    def test_none_image_passes(self):
        req = self._valid(image_base64=None)
        assert req.image_base64 is None

    def test_additional_context_too_long_raises(self):
        with pytest.raises(ValidationError, match="2000"):
            self._valid(additional_context="x" * 2001)

    def test_whitespace_text_stripped_and_validated(self):
        with pytest.raises(ValidationError):
            self._valid(social_media_text="    ")


class TestTranscribeRequestValidation:
    def test_audio_size_limit(self):
        big_audio = "A" * (10 * 1024 * 1024 * 4 // 3 + 100)
        with pytest.raises(ValidationError, match="10 MB"):
            TranscribeRequest(audio_base64=big_audio)

    def test_valid_audio_passes(self):
        req = TranscribeRequest(audio_base64="dGVzdA==")
        assert req.audio_base64 == "dGVzdA=="
