"""
PDF Service for VibeMap AI.
Handles text extraction from PDF files.
"""

import io
import httpx
import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes

async def extract_text_from_url(url: str) -> str:
    """
    Downloads a PDF from a URL and extracts its text.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            return await extract_text_from_bytes(response.content)
    except Exception as e:
        print(f"Error extracting text from PDF URL: {e}")
        return ""

async def extract_text_from_bytes(content: bytes) -> str:
    """
    Extracts text from PDF binary content using pdfplumber with OCR fallback and AI cleanup.
    """
    try:
        text_parts = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        full_text = "\n".join(text_parts).strip()
        
        # If no text extracted, try OCR
        if not full_text:
            print("DEBUG PDF: No text found with pdfplumber, attempting OCR...")
            images = convert_from_bytes(content)
            ocr_parts = []
            for i, image in enumerate(images):
                print(f"DEBUG PDF: Performing OCR on page {i+1}...")
                page_text = pytesseract.image_to_string(image, lang='spa')
                if page_text:
                    ocr_parts.append(page_text)
            full_text = "\n".join(ocr_parts).strip()
            print(f"DEBUG PDF (OCR): Extracted {len(full_text)} characters")
        else:
            print(f"DEBUG PDF (pdfplumber): Extracted {len(full_text)} characters")
            
        if not full_text:
            return ""

        # AI CLEANUP PHASE
        print("DEBUG PDF: Refining menu text with AI...")
        from app.services.openai_service import get_chat_completion
        
        messages = [
            {"role": "system", "content": (
                "Eres un experto en extracción de datos de menús. Tu tarea es limpiar y estructurar el texto extraído por OCR de un PDF de restaurante. "
                "El texto puede tener errores de lectura (ruido), especialmente en precios y símbolos de moneda. "
                "REGLAS:\n"
                "1. Identifica platos, descripciones y precios.\n"
                "2. Si ves precios como '$32K', conviértelos a '$32,000'.\n"
                "3. Si el OCR leyó 'SK' o 'S', interprétalo como '$' si va seguido de números.\n"
                "4. Organiza la información por categorías si es posible (Entradas, Platos Fuertes, Bebidas, etc.).\n"
                "5. Devuelve solo el menú limpio y legible. No añadidas comentarios personales."
            )},
            {"role": "user", "content": f"Texto OCR ruidoso:\n\n{full_text}"}
        ]
        
        refined_text = await get_chat_completion(messages, temperature=0.3, max_tokens=1500)
        print(f"DEBUG PDF: AI refinement complete. Final length: {len(refined_text)}")
        return refined_text

    except Exception as e:
        print(f"Error extracting/refining text from PDF bytes: {e}")
        return ""
