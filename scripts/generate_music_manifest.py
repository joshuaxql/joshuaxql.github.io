#!/usr/bin/env python3
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
MUSIC_DIR = ROOT / 'static' / 'assets' / 'music'
OUTPUT_PATH = MUSIC_DIR / 'tracks.json'
SUPPORTED_EXTENSIONS = {'.mp3'}


def parse_track_name(filename: str) -> tuple[str, str]:
    stem = Path(filename).stem
    if ' - ' in stem:
        title, artist = stem.rsplit(' - ', 1)
        return title.strip(), artist.strip()
    return stem.strip(), ''


def build_track_entry(file_path: Path) -> dict:
    title, artist = parse_track_name(file_path.name)
    relative_path = file_path.relative_to(ROOT).as_posix()
    return {
        'title': title,
        'artist': artist,
        'src': relative_path
    }


def main() -> None:
    tracks = []
    if MUSIC_DIR.exists():
        for file_path in sorted(MUSIC_DIR.iterdir(), key=lambda path: path.name.lower()):
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            tracks.append(build_track_entry(file_path))

    OUTPUT_PATH.write_text(
        json.dumps(tracks, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f'Generated {len(tracks)} tracks -> {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
