import json
from pathlib import Path


EXAM_FILE = Path("lecture_data") / "faculty_exam.json"


class ExamStorage:
    """
    Stores faculty-authored exam questions for the one-time student login assessment.
    Each question is a dict: {"question": "...", "answer": "..."}
    """

    def __init__(self, base_dir: str = "lecture_data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.exam_path = self.base_dir / "faculty_exam.json"
        self._ensure_file()

    def _ensure_file(self):
        if not self.exam_path.exists():
            self._write([])

    def _read(self) -> list:
        with open(self.exam_path, "r") as f:
            return json.load(f)

    def _write(self, data: list):
        with open(self.exam_path, "w") as f:
            json.dump(data, f, indent=2)

    def save_exam_questions(self, questions: list) -> bool:
        """
        Save a list of {"question": "...", "answer": "..."} dicts.
        Replaces any existing questions.
        """
        validated = []
        for q in questions:
            if q.get("question", "").strip() and q.get("answer", "").strip():
                validated.append({
                    "question": q["question"].strip(),
                    "answer": q["answer"].strip(),
                })
        self._write(validated)
        return True

    def get_exam_questions(self) -> list:
        """Return the list of faculty exam questions."""
        return self._read()

    def has_questions(self) -> bool:
        """Check if the faculty has set any exam questions."""
        return len(self._read()) > 0

    def question_count(self) -> int:
        return len(self._read())
