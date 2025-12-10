import io
import zipfile
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document
from typing import Tuple


class FileExtractor:
    """Extract text from various file formats"""
    
    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> str:
        """Extract text from PDF"""
        text = ""
        pdf = PdfReader(io.BytesIO(file_bytes))
        for page in pdf.pages:
            text += page.extract_text() or ""
        return text
    
    @staticmethod
    def extract_from_docx(file_bytes: bytes) -> str:
        """Extract text from DOCX"""
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs])
    
    @staticmethod
    def extract_from_excel(file_bytes: bytes) -> str:
        """Extract text from Excel"""
        df = pd.read_excel(io.BytesIO(file_bytes))
        text = ""
        for i, row in df.iterrows():
            row_text = " | ".join(f"{col}: {row[col]}" for col in df.columns)
            text += f"Row {i+1}: {row_text}\n"
        return text
    
    @staticmethod
    def extract_from_zip(file_bytes: bytes) -> str:
        """Extract text from ZIP archive"""
        text = ""
        extractor = FileExtractor()
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            for filename in z.namelist():
                with z.open(filename) as f:
                    inner = f.read()
                    extracted, _ = extractor.extract(inner, filename)
                    text += extracted + "\n\n"
        return text
    
    def extract(self, file_bytes: bytes, filename: str) -> Tuple[str, bool]:
        """
        Extract text from file based on extension
        
        Returns:
            (extracted_text, success)
        """
        filename = filename.lower()
        
        try:
            if filename.endswith(".pdf"):
                return self.extract_from_pdf(file_bytes), True
            elif filename.endswith(".docx"):
                return self.extract_from_docx(file_bytes), True
            elif filename.endswith((".xlsx", ".xls")):
                return self.extract_from_excel(file_bytes), True
            elif filename.endswith(".zip"):
                return self.extract_from_zip(file_bytes), True
            else:
                # Fallback: try UTF-8 decode
                return file_bytes.decode("utf-8", errors="ignore"), True
        except Exception as e:
            return f"[Error extracting {filename}: {str(e)}]", False