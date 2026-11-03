@echo off
rem Double-click: installs the needed libraries once, then opens the PDF watermark remover window.
cd /d "%~dp0"
py -m pip install --user --quiet pymupdf pikepdf
py remove_pdf_watermark.py --gui
