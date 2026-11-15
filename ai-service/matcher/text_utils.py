"""Outils de normalisation de texte (FR/EN)."""
import re
import unicodedata
from typing import List

STOPWORDS = {
    # français
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "en", "au", "aux", "a",
    "pour", "dans", "sur", "par", "ce", "cette", "ces", "son", "sa", "ses", "il", "elle",
    "nous", "vous", "ils", "elles", "est", "sont", "etre", "avoir", "fait", "avec", "sans",
    "plus", "moins", "tres", "comme", "mais", "donc", "car", "ne", "pas", "qui", "que",
    "quoi", "dont", "leur", "leurs", "mon", "ma", "mes", "ton", "ta", "tes", "notre", "nos",
    "votre", "vos", "je", "tu", "on", "se", "sous", "entre", "chez", "lors", "afin", "tout",
    "tous", "toute", "toutes", "aussi", "ainsi", "etc", "y", "l", "d", "j", "s", "n", "c", "qu",
    # anglais
    "the", "an", "of", "and", "or", "to", "in", "for", "with", "on", "at", "by", "from",
    "is", "are", "was", "were", "be", "been", "this", "that", "these", "those", "as", "it",
    "its", "my", "our", "your", "their", "i", "we", "you", "he", "she", "they",
}


def strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalize(text: str) -> str:
    """Minuscules, sans accents, apostrophes unifiées, espaces compactés.
    Conserve + # . / pour reconnaître C++, C#, Node.js, UI/UX…"""
    if not text:
        return ""
    t = strip_accents(text).lower()
    t = t.replace("’", "'").replace("`", "'").replace("–", "-").replace("—", "-")
    t = re.sub(r"[^a-z0-9+#./'\-\s]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def normalize_aligned(text: str) -> str:
    """Comme normalize() mais caractère par caractère (même longueur que le texte d'origine),
    pour pouvoir citer le passage original du CV à partir d'une recherche normalisée."""
    out = []
    for ch in text or "":
        base = unicodedata.normalize("NFKD", ch)
        base = "".join(c for c in base if not unicodedata.combining(c))[:1] or " "
        base = base.lower()
        if ch in "\u2019`":
            base = "'"
        out.append(base if re.match(r"[a-z0-9+#./'\-]", base) else " ")
    return "".join(out)


def tokens(text: str) -> List[str]:
    """Mots significatifs, avec une racinisation légère (préfixe de 7 lettres)."""
    norm = normalize(text)
    words = re.findall(r"[a-z0-9+#]+", norm)
    out = []
    for w in words:
        if len(w) < 3 or w in STOPWORDS or w.isdigit():
            continue
        out.append(w[:7])
    return out


def split_lines(text: str) -> List[str]:
    lines = [re.sub(r"\s+", " ", l).strip() for l in (text or "").splitlines()]
    return [l for l in lines if l]


def chunk_text(text: str, max_words: int = 40, min_words: int = 3) -> List[str]:
    """Découpe le CV en blocs courts (le modèle sémantique lit ~128 mots max)."""
    chunks, current = [], []
    for line in split_lines(text):
        words = line.split()
        if current and len(current) + len(words) > max_words:
            chunks.append(" ".join(current))
            current = []
        current.extend(words)
        while len(current) > max_words:
            chunks.append(" ".join(current[:max_words]))
            current = current[max_words:]
    if current:
        chunks.append(" ".join(current))
    return [c for c in chunks if len(c.split()) >= min_words]
