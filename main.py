import io
import json
import os
import re
from typing import Optional, Tuple

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image, ImageOps

load_dotenv()

app = FastAPI(title="UniMelb Location Matcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # formal version change to frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview").strip()

if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY in environment variables.")

client = genai.Client(api_key=GEMINI_API_KEY)

UNIMELB_PLACES = [

# Major landmarks
"Baillieu Library",
"Redmond Barry Building",
"Old Arts Building",
"Old Quadrangle",
"Wilson Hall",
"Sidney Myer Asia Centre",
"1888 Building",
"Market Hall",

# Arts / humanities
"Arts West",
"Babel Building",
"Elisabeth Murdoch Building",
"John Medley Building",
"Old Arts Building",

# Libraries
"Eastern Resource Centre Library",
"Giblin Eunson Library",
"Law Library",
"Baillieu Library"

# Science precinct
"Chemistry Building",
"Old Physics Building",
"Old Geology Building",
"Old Microbiology Building",
"Old Metallurgy Building",

# Biosciences
"Biosciences 1",
"Biosciences 2",
"Biosciences 3",

# Engineering
"Mechanical Engineering Building",
"Electrical and Electronic Engineering Building",
"Infrastructure Engineering Building",
"Chemical Engineering Building",
"Engineering Workshops",
"Walter Boas Building",

# Medical / research
"Medical Building",
"Doherty Institute",
"Bio21 Institute",

# Cultural venues
"Ian Potter Museum of Art",
"Grainger Museum",
"Science Gallery Melbourne",
"Melba Hall",

# Student facilities
"Student Pavilion",
"Union House",
"The Spot",
"Stop 1",

# Outdoor landmarks
"South Lawn",
"System Garden",
"University Square",
"Lincoln Square",
"Argyle Square",

# Sports
"Nona Lee Sports Centre",
"University Oval"

]


def clamp_int(value: int, lo: int, hi: int) -> int:
    return max(lo, min(value, hi))

def preprocess_image(
    image_bytes: bytes,
    max_side: int = 1280,
    jpeg_quality: int = 85,
):
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    img = ImageOps.exif_transpose(img).convert("RGB")
    original_width, original_height = img.size

    # slightly cut
    width, height = img.size
    longest = max(width, height)
    if longest > max_side:
        scale = max_side / float(longest)
        new_w = max(64, int(width * scale))
        new_h = max(64, int(height * scale))
        img = img.resize((new_w, new_h), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=jpeg_quality, optimize=True)
    processed_bytes = out.getvalue()

    meta = {
        "original_size": {"width": original_width, "height": original_height},
        "processed_size": {"width": img.size[0], "height": img.size[1]},
        "output_mime_type": "image/jpeg",
        "processed_bytes_length": len(processed_bytes),
    }
    return processed_bytes, "image/jpeg", meta

def extract_json(text: str) -> dict:
    """
    Try to extract JSON from the model output
    """
    text = text.strip()

    # Try an overall analysis
    try:
        return json.loads(text)
    except Exception:
        pass

    # Try to extract the ' ' 'json... ` ` `
    fenced = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.S)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except Exception:
            pass

    # Finally, try to catch the first {... }
    braces = re.search(r"(\{.*\})", text, flags=re.S)
    if braces:
        try:
            return json.loads(braces.group(1))
        except Exception:
            pass

    raise ValueError(f"Model did not return valid JSON. Raw text: {text}")


def build_prompt(place_name: Optional[str]) -> str:
    candidate_text = "、".join(UNIMELB_PLACES) if UNIMELB_PLACES else "(No candidate list was provided)"

    if place_name and place_name.strip():
        return f"""
        You are an assistant that identifies locations within the University of Melbourne campus.

        Task:
        You will be given one image and a location name provided by the user.
        Your job is to determine whether the image matches the given location.

        Given location name:
        {place_name.strip()}

        The field "identified_place" must be chosen from the following list:
        {candidate_text}

        If you cannot determine the location, return "unknown".
        Do NOT output any place name that is not in the list above.

        Requirements:
        1. Output ONLY JSON. Do not include any additional text.
        2. If the image clearly matches the given location name, set matched=true; otherwise matched=false.
        3. confidence must be a number between 0 and 1.
        4. identified_place should be the location that best matches the image; if uncertain, return "unknown".
        5. humorous_intro must always be an empty string "" in this mode.

        JSON format:
        {{
          "mode": "verify",
          "input_place_name": "string",
          "matched": true,
          "confidence": 0.86,
          "identified_place": "string",
          "reason": "string",
          "humorous_intro": ""
        }}
        """.strip()

    return f"""
    You are an assistant that identifies locations within the University of Melbourne campus.

    Task:
    You will be given one image, but no location name.
    Your job is to determine which place within the University of Melbourne campus the image most likely represents,
    and generate one humorous sentence in English describing that place.

    The field "identified_place" must be chosen from the following list:
    {candidate_text}

    If the location cannot be determined, return "unknown".
    Do NOT output any place name that is not included in the list above.

    Requirements:
    1. Output ONLY JSON. Do not include any additional text.
    2. identified_place must be the most likely place shown in the image; if uncertain, return "unknown".
    3. confidence must be a number between 0 and 1.
    4. humorous_intro must be a single sentence in English. It should be light and humorous, but not offensive or inappropriate.
    5. matched must always be null in this mode.
    6. input_place_name must always be an empty string "" in this mode.

    JSON format:
    {{
      "mode": "identify",
      "input_place_name": "",
      "matched": null,
      "confidence": 0.72,
      "identified_place": "string",
      "reason": "string",
      "humorous_intro": "string"
    }}
    """.strip()


@app.get("/")
def health():
    return {
        "ok": True,
        "service": "unimelb-location-backend",
        "model": GEMINI_MODEL,
    }


@app.post("/match-location")
async def match_location(
    image: UploadFile = File(...),
    place_name: Optional[str] = Form(default=""),
):
    # Basic verification
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty image file.")

    # Preprocessing: Center cropping + scaling + JPEG compression
    processed_bytes, processed_mime, image_meta = preprocess_image(
        raw_bytes,
        max_side=1280,
        jpeg_quality=85,
    )

    prompt = build_prompt(place_name)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(
                    data=processed_bytes,
                    mime_type=processed_mime,
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                temperature=0.2,
                media_resolution=types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API call failed: {e}")

    raw_text = response.text or ""
    try:
        parsed = extract_json(raw_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to parse model JSON output.",
                "error": str(e),
                "raw_model_output": raw_text,
            },
        )

    # Safe Cleaning
    mode = parsed.get("mode", "verify" if place_name.strip() else "identify")
    result = {
        "mode": mode,
        "input_place_name": parsed.get("input_place_name", place_name.strip()),
        "matched": parsed.get("matched", None if not place_name.strip() else False),
        "confidence": parsed.get("confidence", 0),
        "identified_place": parsed.get("identified_place", "unknown"),
        "reason": parsed.get("reason", ""),
        "humorous_intro": parsed.get("humorous_intro", "" if place_name.strip() else ""),
        "image_meta": image_meta,
    }

    # If it is in verify mode, give the front end a more direct status field
    if place_name.strip():
        result["status"] = "Match successful" if bool(result["matched"]) else "Mismatch"
    else:
        result["status"] = "Match successful" if result["identified_place"] != "unknown" else "Can not verify"

    return result