"""
UniMelb Location Matcher API

This module implements a FastAPI backend service that uses Google Gemini
to identify or verify locations within the University of Melbourne campus
based on uploaded images.

Main Features
-------------
1. Image location verification
   - Given an image and a place name, determine whether the image matches
     the specified University of Melbourne location.

2. Image location identification
   - Given only an image, identify the most likely location on campus
     from a predefined candidate list.

3. Image preprocessing
   - Automatically correct orientation
   - Resize large images
   - Convert to JPEG format

4. Gemini integration
   - Sends image + prompt to Gemini model
   - Parses structured JSON response

API Endpoints
-------------
GET  /
    Health check endpoint.

POST /match-location
    Upload an image and optionally a place name to verify or identify
    a campus location.

"""
"""
Response JSON format

Verify Mode
-----------
{
  "mode": "verify",
  "input_place_name": "Baillieu Library",
  "matched": true,
  "confidence": 0.86,
  "identified_place": "Baillieu Library",
  "reason": "...",
  "humorous_intro": "",
  "image_meta": {...},
  "status": "Match successful"
}

Identify Mode
-------------
{
  "mode": "identify",
  "input_place_name": "",
  "matched": null,
  "confidence": 0.72,
  "identified_place": "Union House",
  "reason": "...",
  "humorous_intro": "...",
  "image_meta": {...},
  "status": "Identified"
}
"""

import io
import json
import os
import re
from typing import Optional

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

# The .env file is not provided
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

# Libraries
"Eastern Resource Centre Library",
"Giblin Eunson Library",
"Law Library",

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

def preprocess_image(
    image_bytes: bytes,
    max_side: int = 1280,
    jpeg_quality: int = 85,
):
    """
    Preprocess an uploaded image before sending it to the Gemini model.

    Steps
    -----
    1. Open image from raw bytes
    2. Fix EXIF orientation
    3. Convert to RGB format
    4. Resize if the longest side exceeds `max_side`
    5. Compress to JPEG format

    Parameters
    ----------
    image_bytes : bytes
        Raw image data uploaded by the client.

    max_side : int
        Maximum allowed size of the longest side of the image.

    jpeg_quality : int
        JPEG compression quality.

    Returns
    -------
    Tuple[bytes, str, dict]
        processed_bytes : bytes
            Processed JPEG image data.

        mime_type : str
            MIME type of the processed image.

        meta : dict
            Metadata about original and processed image size.
    """
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
    Extract a JSON object from the Gemini model output.

    The model is instructed to return pure JSON, but sometimes
    it may include additional text or Markdown formatting.

    This function attempts multiple strategies to recover JSON:

    1. Direct JSON parsing
    2. Extract JSON from ```json fenced blocks
    3. Extract the first {...} structure

    Parameters
    ----------
    text : str
        Raw text output from the Gemini model.

    Returns
    -------
    dict
        Parsed JSON object.

    Raises
    ------
    ValueError
        If no valid JSON structure can be extracted.
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
    """
    Build the prompt sent to the Gemini model.

    Two modes are supported:

    1. Verify Mode
       If a place name is provided, the model determines whether
       the uploaded image matches the specified location.

    2. Identify Mode
       If no place name is provided, the model identifies the most
       likely campus location shown in the image.

    Parameters
    ----------
    place_name : Optional[str]
        User-provided location name.

    Returns
    -------
    str
        Prompt text sent to Gemini.
    """
    candidate_text = ", ".join(UNIMELB_PLACES) if UNIMELB_PLACES else "(No candidate list was provided)"

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
    """
    Match or identify a University of Melbourne campus location
    based on an uploaded image.

    Parameters
    ----------
    image : UploadFile
        Image uploaded by the user.

    place_name : str (optional)
        If provided, the API verifies whether the image matches
        this specific location.

        If empty, the API attempts to identify the location.

    Returns
    -------
    dict
        JSON response containing:

        mode
            "verify" or "identify"

        matched
            True/False when verifying a location

        identified_place
            Best guess of the location from candidate list

        confidence
            Confidence score (0–1)

        reason
            Explanation of the model decision

        humorous_intro
            A humorous sentence describing the place (identify mode)

        image_meta
            Metadata of the processed image

        status
            Human-readable status for frontend display
    """
    # Basic verification
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty image file.")

    # Preprocessing: scaling + JPEG compression
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
        result["status"] = "Identified" if result["identified_place"] != "unknown" else "Can not verify"

    return result