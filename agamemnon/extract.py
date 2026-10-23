import io
from pathlib import Path

MAX_UPLOAD_BYTES = 2_000_000


def extract_text(filename: str, data: bytes) -> str:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("The upload is larger than 2 MB.")
    suffix = Path(filename).suffix.lower()
    if suffix == ".txt":
        text = data.decode("utf-8", errors="replace")
    elif suffix == ".pdf":
        text = _pdf_text(data)
    elif suffix == ".docx":
        text = _docx_text(data)
    else:
        raise ValueError("Upload a .txt, .pdf, or .docx file.")
    cleaned = "".join(ch for ch in text if ch in "\n\t" or ord(ch) >= 32)
    if not cleaned.strip():
        raise ValueError("No text could be read from that file.")
    return cleaned


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _docx_text(data: bytes) -> str:
    from docx import Document

    document = Document(io.BytesIO(data))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)
