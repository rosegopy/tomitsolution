import base64
import json
import logging
import re
import uuid
from typing import Any

from emergentintegrations.llm.chat import ChatError, FileContentWithMimeType, LlmChat, UserMessage

logger = logging.getLogger(__name__)

VIDEO_MIME_TYPES = {
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "avi": "video/x-msvideo",
    "mkv": "video/x-matroska",
}

SYSTEM_PROMPT = """You are an expert IT asset disposition (ITAD) analyst for TomIT Solution in India.
Analyze uploaded videos of IT equipment and identify every visible device.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "summary": "One sentence overview of what was seen",
  "equipment_items": [
    {
      "category": "One of: Laptops, Desktops, Servers, Networking Gears, Printers, Other ITAD Assets",
      "specification": "Brand/model/spec details visible or reasonably inferred",
      "condition": "One of: Working - Like New, Working - Excellent, Working - Minor Wear, Functional - Medium Wear, Not Working - Parts Recovery Only",
      "quantity": 1,
      "confidence": "high|medium|low",
      "notes": "Optional short note about visibility or uncertainty"
    }
  ]
}

Rules:
- Count distinct units when possible; default quantity to 1 if unclear.
- Prefer categories that match enterprise ITAD inventory.
- Be conservative on condition when video quality is poor.
- If nothing IT-related is visible, return equipment_items as an empty array and explain in summary.
"""


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    return json.loads(cleaned)


async def analyze_equipment_video(
    *,
    api_key: str,
    video_bytes: bytes,
    mime_type: str,
    categories: list[str],
    filename: str,
) -> dict[str, Any]:
    if not api_key:
        raise ValueError("AI video analysis is not configured")

    session_id = f"video-{uuid.uuid4()}"
    category_hint = ", ".join(categories) if categories else "Laptops, Desktops, Servers, Networking Gears, Printers, Other ITAD Assets"

    chat = (
        LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SYSTEM_PROMPT,
        )
        .with_model("gemini", "gemini-2.0-flash")
    )

    temp_path = f"/tmp/{session_id}-{filename}"
    with open(temp_path, "wb") as handle:
        handle.write(video_bytes)

    try:
        prompt = (
            "Analyze this video of IT equipment for a buyback valuation request. "
            f"Use these pricing categories when possible: {category_hint}. "
            "Identify each distinct device, estimate condition from what is visible, "
            "and return the required JSON schema only."
        )
        user_message = UserMessage(
            text=prompt,
            file_contents=[FileContentWithMimeType(mime_type, temp_path)],
        )
        raw_response = await chat.send_message(user_message)
        parsed = _extract_json(raw_response)
    except ChatError as exc:
        logger.error("Gemini video analysis failed: %s", exc)
        raise ValueError("AI could not analyze this video. Try a shorter clip with clearer footage.") from exc
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON response: %s", raw_response[:500])
        raise ValueError("AI analysis returned an unexpected format. Please try again.") from exc
    finally:
        try:
            import os

            os.remove(temp_path)
        except OSError:
            pass

    items = parsed.get("equipment_items") or []
    normalized_items = []
    allowed_categories = set(categories) if categories else None

    for item in items:
        category = item.get("category") or "Other ITAD Assets"
        if allowed_categories and category not in allowed_categories:
            category = "Other ITAD Assets"

        quantity = item.get("quantity", 1)
        try:
            quantity = max(1, min(1000, int(quantity)))
        except (TypeError, ValueError):
            quantity = 1

        normalized_items.append(
            {
                "category": category,
                "specification": str(item.get("specification") or "Identified via AI video scan").strip(),
                "condition": item.get("condition") or "Working - Excellent",
                "quantity": quantity,
                "confidence": item.get("confidence") or "medium",
                "notes": item.get("notes") or "",
            }
        )

    return {
        "summary": parsed.get("summary") or "AI video analysis completed.",
        "equipment_items": normalized_items,
        "raw_model": "gemini-2.0-flash",
    }
