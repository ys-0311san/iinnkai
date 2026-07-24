#!/usr/bin/env python3
"""Render等のWSGIホスティング用エントリポイント。
gunicornはモジュールとしてimportするため、app.py実行時の暗黙のsys.path挿入
（スクリプト自身のディレクトリ）が起きない。ここで明示的に積んでから app を読む。
"""
from __future__ import annotations

import sys
from pathlib import Path

GENERATOR_DIR = Path(__file__).resolve().parent
if str(GENERATOR_DIR) not in sys.path:
    sys.path.insert(0, str(GENERATOR_DIR))

from app import app  # noqa: E402,F401
