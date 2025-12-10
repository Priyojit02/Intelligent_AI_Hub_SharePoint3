# utils/parallel.py
import concurrent.futures
import threading
from typing import List, Dict, Any, Callable
import logging

logger = logging.getLogger(__name__)


class ParallelProcessor:
    """Handle parallel processing of files with configurable workers and batching"""

    def __init__(self, max_workers: int = 10, batch_size: int = 20):
        self.max_workers = max_workers
        self.batch_size = batch_size
        self._lock = threading.Lock()

    def process_files_parallel(
        self,
        files: List[Dict[str, Any]],
        download_func: Callable[[str], bytes],
        extract_func: Callable[[bytes, str], tuple[str, bool]]
    ) -> str:
        """
        Process files in parallel: download and extract text

        Args:
            files: List of file metadata dicts with 'downloadUrl' and 'name' keys
            download_func: Function to download file content (takes download_url)
            extract_func: Function to extract text (takes content, filename) -> (text, success)

        Returns:
            Combined extracted text from all files
        """
        if not files:
            return ""

        logger.info(f"Processing {len(files)} files with {self.max_workers} workers")

        # Process in batches to avoid overwhelming the system
        all_texts = []
        for i in range(0, len(files), self.batch_size):
            batch = files[i:i + self.batch_size]
            logger.info(f"Processing batch {i//self.batch_size + 1}/{(len(files) + self.batch_size - 1)//self.batch_size}")

            batch_texts = self._process_batch(batch, download_func, extract_func)
            all_texts.extend(batch_texts)

        # Combine all extracted texts
        combined_text = "\n\n".join(all_texts)
        successful_extractions = len([t for t in all_texts if t.strip()])

        logger.info(f"Successfully extracted text from {successful_extractions}/{len(files)} files")
        return combined_text

    def _process_batch(
        self,
        batch: List[Dict[str, Any]],
        download_func: Callable[[str], bytes],
        extract_func: Callable[[bytes, str], tuple[str, bool]]
    ) -> List[str]:
        """Process a single batch of files"""
        texts = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_file = {
                executor.submit(self._process_single_file, file_info, download_func, extract_func): file_info
                for file_info in batch
            }

            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_file):
                file_info = future_to_file[future]
                try:
                    text = future.result()
                    texts.append(text)
                except Exception as e:
                    logger.error(f"Failed to process file {file_info.get('name', 'unknown')}: {e}")
                    texts.append("")  # Add empty string to maintain order

        return texts

    def _process_single_file(
        self,
        file_info: Dict[str, Any],
        download_func: Callable[[str], bytes],
        extract_func: Callable[[bytes, str], tuple[str, bool]]
    ) -> str:
        """Process a single file: download and extract"""
        try:
            download_url = file_info.get("downloadUrl") or file_info.get("download_url")
            filename = file_info.get("name", "unknown")

            if not download_url:
                logger.warning(f"No download URL for file: {filename}")
                return ""

            # Download file
            content = download_func(download_url)

            # Extract text
            text, success = extract_func(content, filename)

            if success and text.strip():
                logger.debug(f"Successfully processed: {filename} ({len(text)} chars)")
                return text
            else:
                logger.warning(f"Failed to extract text from: {filename}")
                return ""

        except Exception as e:
            logger.error(f"Error processing file {file_info.get('name', 'unknown')}: {e}")
            return ""