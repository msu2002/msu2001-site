#!/usr/bin/env python3
"""
remove_pdf_watermark.py  -  إزالة العلامة المائية من ملفات PDF
Removes watermarks from PDF files (one purpose only).

Works on macOS / Windows / Linux.   Needs:  pip install pymupdf pikepdf

What it removes
  1. Watermark layers (optional-content layers named "watermark")
  2. Text watermarks (diagonal/rotated text repeated on the pages, or any text you name)
  3. Image watermarks (transparent / repeated images)
  4. Watermark annotations  (and stamps, if you ask)

It does NOT work on watermarks that are baked into a scanned/flattened page image.
Use it only on files you have the right to modify. The original is never overwritten:
the result is saved as  <name>_clean.pdf.

Usage
  python3 remove_pdf_watermark.py file.pdf                     # automatic
  python3 remove_pdf_watermark.py file.pdf --text "CONFIDENTIAL"
  python3 remove_pdf_watermark.py file.pdf --list              # only show what it finds
  python3 remove_pdf_watermark.py                              # opens the window (GUI)
"""
import argparse
import io
import os
import re
import sys
from collections import defaultdict

try:
    import pymupdf
except ImportError:  # older PyMuPDF
    import fitz as pymupdf
try:
    import pikepdf
except ImportError:
    pikepdf = None

CREDIT_AR = "قام بهذا العمل فهد بن عبدالله الجروان"
CREDIT_EN = "Made by Fahad bin Abdullah Al-Jarwan"
WELCOME_AR = "مرحبًا بك في أداة إزالة العلامة المائية من ملفات PDF"
WELCOME_EN = "Welcome to the PDF Watermark Remover"

LAYER_RE = re.compile(r"water\s*-?\s*mark|علامة\s*مائية", re.I)
KNOWN_WORDS = [
    "confidential", "draft", "sample", "watermark", "do not copy", "preview",
    "internal", "top secret", "specimen", "سري", "مسودة", "نسخة",
]


def norm(s):
    """Normalise text for comparison: no whitespace, case-folded."""
    return re.sub(r"\s+", "", s or "").casefold()


# --------------------------------------------------------------------------
# 1. Analysis (PyMuPDF): find watermark candidates
# --------------------------------------------------------------------------
def analyze(doc):
    n = doc.page_count
    texts = defaultdict(lambda: {"pages": set(), "rotated": False, "size": 0.0, "sample": ""})
    for pno in range(n):
        page = doc[pno]
        try:
            d = page.get_text("dict")
        except Exception:
            continue
        for block in d.get("blocks", []):
            for line in block.get("lines", []):
                text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
                key = norm(text)
                if len(key) < 3 or key.isdigit():
                    continue
                dx, dy = line.get("dir", (1.0, 0.0))
                rotated = abs(dy) > 0.05 or dx < 0
                size = max((s.get("size", 0) for s in line.get("spans", [])), default=0)
                e = texts[key]
                e["pages"].add(pno)
                e["rotated"] = e["rotated"] or rotated
                e["size"] = max(e["size"], size)
                e["sample"] = e["sample"] or text

    cands = []
    for key, e in texts.items():
        frac = len(e["pages"]) / max(n, 1)
        known = any(norm(w) in key for w in KNOWN_WORDS)
        auto = False
        if e["rotated"] and ((n >= 2 and frac >= 0.5) or e["size"] >= 24):
            auto = True
        elif known and e["size"] >= 36 and (n == 1 or frac >= 0.6):
            auto = True
        repeated = n >= 2 and frac >= 0.6
        if auto or repeated:
            cands.append({
                "key": key, "text": e["sample"], "pages": len(e["pages"]),
                "rotated": e["rotated"], "size": round(e["size"], 1), "auto": auto,
            })
    return cands


def find_image_targets(doc, include_all_repeated=False):
    """Return {xref: reason} for images that look like watermarks."""
    n = doc.page_count
    usage = defaultdict(lambda: {"pages": set(), "area": 0.0, "smask": 0})
    for pno in range(n):
        page = doc[pno]
        parea = max(page.rect.width * page.rect.height, 1)
        try:
            imgs = page.get_images(full=True)
            infos = page.get_image_info(xrefs=True)
        except Exception:
            continue
        smask_of = {im[0]: im[1] for im in imgs}
        for info in infos:
            xref = info.get("xref", 0)
            if not xref:
                continue
            b = pymupdf.Rect(info["bbox"])
            u = usage[xref]
            u["pages"].add(pno)
            u["area"] = max(u["area"], (b.width * b.height) / parea)
            u["smask"] = smask_of.get(xref, 0)
    out = {}
    for xref, u in usage.items():
        frac = len(u["pages"]) / max(n, 1)
        if u["smask"] and (frac >= 0.5 or u["area"] >= 0.2):
            out[xref] = "transparent image on %d page(s)" % len(u["pages"])
        elif include_all_repeated and n >= 3 and frac >= 0.8 and u["area"] >= 0.25:
            out[xref] = "large image repeated on %d page(s)" % len(u["pages"])
    return out


# --------------------------------------------------------------------------
# 2. Content-stream surgery (pikepdf): layers + exact text blocks
# --------------------------------------------------------------------------
_HEX = re.compile(r"<([0-9A-Fa-f\s]*)>")


def _hex_to_str(h):
    h = re.sub(r"\s+", "", h)
    if len(h) % 2:
        h += "0"
    try:
        return bytes.fromhex(h).decode("utf-16-be", "ignore")
    except Exception:
        return ""


def parse_tounicode(data):
    """Parse a ToUnicode CMap -> (dict code->str, bytes_per_code)."""
    txt = data.decode("latin-1", "ignore")
    m, width = {}, 0
    for sec in re.findall(r"beginbfchar(.*?)endbfchar", txt, re.S):
        for a, b in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f\s]*)>", sec):
            width = width or len(a) // 2
            m[int(a, 16)] = _hex_to_str(b)
    for sec in re.findall(r"beginbfrange(.*?)endbfrange", txt, re.S):
        for lo, hi, rest in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[.*?\]|<[0-9A-Fa-f\s]*>)", sec, re.S):
            width = width or len(lo) // 2
            lo_i, hi_i = int(lo, 16), int(hi, 16)
            if hi_i - lo_i > 70000:
                continue
            if rest.startswith("["):
                for i, h in enumerate(_HEX.findall(rest)):
                    m[lo_i + i] = _hex_to_str(h)
            else:
                base = _hex_to_str(_HEX.findall(rest)[0])
                for i in range(hi_i - lo_i + 1):
                    m[lo_i + i] = (base[:-1] + chr(ord(base[-1]) + i)) if base else ""
    return m, (width or 1)


class FontDecoder:
    def __init__(self, font):
        self.map = None
        self.width = 1
        self.ok = True
        try:
            if "/ToUnicode" in font:
                self.map, self.width = parse_tounicode(font.ToUnicode.read_bytes())
            elif font.get("/Subtype") == "/Type0":
                self.ok = False  # composite font without ToUnicode: cannot decode
        except Exception:
            self.ok = False

    def decode(self, raw):
        if not self.ok:
            return None
        if self.map is None:
            return raw.decode("cp1252", "ignore")
        w = self.width
        out = []
        for i in range(0, len(raw) - w + 1, w):
            out.append(self.map.get(int.from_bytes(raw[i:i + w], "big"), ""))
        return "".join(out)


def _inherited_resources(obj):
    seen = 0
    while obj is not None and seen < 50:
        if "/Resources" in obj:
            return obj.Resources
        obj = obj.get("/Parent")
        seen += 1
    return None


class Stripper:
    def __init__(self, pdf, targets, layer_re=LAYER_RE):
        self.pdf = pdf
        self.targets = [t for t in targets if t]
        self.ocg_ids = set()
        self.removed_layers = 0
        self.removed_text = 0
        self.matched_targets = set()
        self.visited = set()
        self.font_cache = {}
        try:
            props = pdf.Root.get("/OCProperties")
            if props is not None:
                for ocg in props.get("/OCGs", []):
                    if layer_re.search(str(ocg.get("/Name", ""))):
                        self.ocg_ids.add(ocg.objgen)
        except Exception:
            pass

    # -- helpers
    def _is_wm_oc(self, oc):
        if oc is None:
            return False
        try:
            if oc.objgen in self.ocg_ids:
                return True
            if oc.get("/Type") == "/OCMD":
                g = oc.get("/OCGs")
                if g is None:
                    return False
                items = list(g) if isinstance(g, pikepdf.Array) else [g]
                return bool(items) and all(i.objgen in self.ocg_ids for i in items)
        except Exception:
            pass
        return False

    def _decoder(self, font):
        key = font.objgen if font.is_indirect else id(font)
        if key not in self.font_cache:
            self.font_cache[key] = FontDecoder(font)
        return self.font_cache[key]

    def _block_text(self, ops, fonts, font_obj):
        out = []
        for operands, op in ops:
            if op in ("Tj", "'", '"') and operands:
                items = [operands[-1]]
            elif op == "TJ" and operands:
                items = list(operands[0])
            else:
                continue
            dec = self._decoder(font_obj[0]) if font_obj[0] is not None else None
            for it in items:
                if isinstance(it, pikepdf.String):
                    raw = bytes(it)
                    t = dec.decode(raw) if dec else raw.decode("cp1252", "ignore")
                    if t is None:
                        return None
                    out.append(t)
        return "".join(out)

    def _matches(self, text):
        nt = norm(text)
        if not nt:
            return None
        for t in self.targets:
            # Arabic/RTL text can be stored in visual or logical order: try both
            if (t in nt or t in nt[::-1]) and len(nt) <= len(t) * 1.5 + 3:
                return t
        return None

    # -- main walker
    def process(self, owner, parent_resources=None):
        """owner: a page or a form XObject stream. Returns True if modified."""
        gen = owner.objgen if owner.is_indirect else None
        if gen is not None:
            if gen in self.visited:
                return False
            self.visited.add(gen)
        res = _inherited_resources(owner) or parent_resources
        if res is None:
            return False
        props = res.get("/Properties", {})
        fonts = res.get("/Font", {})
        xobjs = res.get("/XObject", {})

        try:
            instrs = pikepdf.parse_content_stream(owner)
        except Exception:
            return False

        out, changed = [], False
        skip_depth = 0           # >0 while inside a watermark layer
        font_stack, font_obj = [], [None]
        block, in_bt = [], False

        for ins in instrs:
            op = str(getattr(ins, "operator", ""))
            operands = list(getattr(ins, "operands", []))

            if skip_depth:
                if op in ("BDC", "BMC"):
                    skip_depth += 1
                elif op == "EMC":
                    skip_depth -= 1
                changed = True
                continue

            if op == "BDC" and len(operands) == 2 and str(operands[0]) == "/OC":
                oc = props.get(str(operands[1])) if isinstance(operands[1], pikepdf.Name) else None
                if self._is_wm_oc(oc):
                    skip_depth = 1
                    self.removed_layers += 1
                    changed = True
                    continue

            if op == "Do" and operands:
                xo = xobjs.get(str(operands[0]))
                if xo is not None:
                    if self._is_wm_oc(xo.get("/OC")):
                        self.removed_layers += 1
                        changed = True
                        continue
                    if xo.get("/Subtype") == "/Form":
                        if self.process(xo, res):
                            changed = True

            if op == "q":
                font_stack.append(font_obj[0])
            elif op == "Q" and font_stack:
                font_obj[0] = font_stack.pop()
            elif op == "Tf" and operands:
                font_obj[0] = fonts.get(str(operands[0])) if fonts else None

            if op == "BT":
                in_bt, block = True, [ins]
                continue
            if in_bt:
                block.append(ins)
                if op == "ET":
                    in_bt = False
                    pairs = [(list(getattr(b, "operands", [])), str(getattr(b, "operator", ""))) for b in block]
                    # keep font state in sync with Tf inside the block
                    for oprs, o in pairs:
                        if o == "Tf" and oprs:
                            font_obj[0] = fonts.get(str(oprs[0])) if fonts else None
                    text = self._block_text(pairs, fonts, font_obj)
                    hit = self._matches(text) if text is not None else None
                    if hit:
                        self.removed_text += 1
                        self.matched_targets.add(hit)
                        changed = True
                    else:
                        out.extend(block)
                    block = []
                continue
            out.append(ins)

        if in_bt:      # unterminated BT: keep as is
            out.extend(block)

        if changed:
            data = pikepdf.unparse_content_stream(out)
            if isinstance(owner, pikepdf.Page) or owner.get("/Type") == "/Page":
                owner["/Contents"] = self.pdf.make_stream(data)
            else:
                owner.write(data)

        # annotations that belong to a watermark layer
        if self.ocg_ids and "/Annots" in owner:
            keep = [a for a in owner.Annots if not self._is_wm_oc(a.get("/OC"))]
            if len(keep) != len(owner.Annots):
                self.removed_layers += len(owner.Annots) - len(keep)
                owner["/Annots"] = pikepdf.Array(keep)
                changed = True
        return changed


# --------------------------------------------------------------------------
# 3. The whole job
# --------------------------------------------------------------------------
def remove_watermarks(src, dst, texts=None, stamps=False, all_images=False,
                      aggressive=False, password=None, auto=True, log=print, scan=True):
    texts = [norm(t) for t in (texts or []) if t.strip()]
    log("▶ %s" % os.path.basename(src))

    doc = pymupdf.open(src)
    if doc.needs_pass:
        if not password or not doc.authenticate(password):
            raise RuntimeError("الملف محمي بكلمة مرور / the file is password-protected (use --password)")
    cands = analyze(doc) if auto else []
    targets = list(texts)
    for c in cands:
        if c["auto"] and c["key"] not in targets and auto:
            targets.append(c["key"])
            log("  • نص علامة مائية / watermark text found: “%s” (%d pages%s)" %
                (c["text"], c["pages"], ", rotated" if c["rotated"] else ""))
    doc.close()

    # ---- step A: layers + text blocks (pikepdf)
    data = open(src, "rb").read()
    if pikepdf is not None:
        pdf = pikepdf.open(io.BytesIO(data), password=password or "")
        st = Stripper(pdf, targets)
        for page in pdf.pages:
            st.process(page.obj)
        if st.removed_layers:
            log("  ✓ طبقات/عناصر محذوفة / layer items removed: %d" % st.removed_layers)
        if st.removed_text:
            log("  ✓ كتل نصية محذوفة / text blocks removed: %d" % st.removed_text)
        buf = io.BytesIO()
        pdf.save(buf)
        data = buf.getvalue()
        missed = [t for t in targets if t not in st.matched_targets]
    else:
        log("  ! pikepdf غير مثبتة: تخطي الطبقات والنص / pikepdf missing: layers/text step skipped")
        missed = list(targets)

    doc = pymupdf.open(stream=data, filetype="pdf")
    # computed AFTER step A because saving renumbers object ids (xrefs)
    img_targets = find_image_targets(doc, all_images) if (auto or all_images) else {}

    # ---- step B: annotations
    removed_annots = 0
    for page in doc:
        for a in list(page.annots() or []):
            t = a.type[0]
            if t == getattr(pymupdf, "PDF_ANNOT_WATERMARK", 25) or (stamps and t == pymupdf.PDF_ANNOT_STAMP):
                page.delete_annot(a)
                removed_annots += 1
    if removed_annots:
        log("  ✓ تعليقات علامة مائية / watermark annotations removed: %d" % removed_annots)

    # ---- step C: images
    done = set()
    for pno in range(doc.page_count):
        page = doc[pno]
        for im in page.get_images(full=True):
            xref = im[0]
            if xref in img_targets and xref not in done:
                try:
                    page.delete_image(xref)
                    done.add(xref)
                    log("  ✓ صورة محذوفة / image removed (%s)" % img_targets[xref])
                except Exception as e:
                    log("  ! تعذر حذف صورة / could not remove image: %s" % e)

    # ---- step D (optional): redaction fallback for text that stream matching missed
    if aggressive and missed:
        for pno in range(doc.page_count):
            page = doc[pno]
            raw = page.get_text("rawdict")
            hit = False
            for b in raw.get("blocks", []):
                for ln in b.get("lines", []):
                    chars = [c for s in ln.get("spans", []) for c in s.get("chars", [])]
                    text = norm("".join(c["c"] for c in chars))
                    if any((t in text or t in text[::-1]) and len(text) <= len(t) * 1.5 + 3 for t in missed):
                        for c in chars:
                            page.add_redact_annot(pymupdf.Rect(c["bbox"]), fill=False)
                        hit = True
            if hit:
                try:
                    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                                          graphics=getattr(pymupdf, "PDF_REDACT_LINE_ART_NONE", 0),
                                          text=getattr(pymupdf, "PDF_REDACT_TEXT_REMOVE", 0))
                except TypeError:
                    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
        log("  ✓ وضع متقدم / aggressive mode applied (may touch nearby text)")

    # ---- step E: watermark baked into scanned page images
    scanned = 0
    found_other = bool(targets or img_targets or removed_annots) or bool(pikepdf and st.removed_layers)
    if scan and auto and not found_other:
        scanned = clean_scanned_pages(doc, log)
        if scanned:
            log("  ✓ صفحات ممسوحة ضوئيًا: أُزيلت العلامة الرمادية من الصورة / scanned pages cleaned: %d" % scanned)

    doc.save(dst, garbage=3, deflate=True)
    doc.close()

    # ---- verify: is the text still there?
    check = pymupdf.open(dst)
    remaining = [c for c in analyze(check) if c["key"] in targets]
    check.close()
    for c in remaining:
        log("  ! ما زال النص موجودًا / still present: “%s” — جرّب --aggressive" % c["text"])
    nothing = not found_other and not scanned
    if nothing:
        log("  ℹ ما وجدت علامة مائية قابلة للإزالة. قد تكون مدمجة في صورة الصفحة. "
            "/ No removable watermark found (it may be baked into the page image).")
    log("  → %s" % dst)
    return dst


def clean_scanned_pages(doc, log=print, lo=170, hi=215, tol=8):
    """Scanned pages: the watermark is part of the picture itself. It is usually a light
    gray, so turn light, colourless pixels white (levels stretch lo..hi -> 0..255) and keep
    dark text and coloured content. Returns the number of pages changed."""
    try:
        import numpy as np
    except ImportError:
        np = None
    changed = 0
    for page in doc:
        area = page.rect.width * page.rect.height
        if len(page.get_text().strip()) > 20:
            continue
        for im in page.get_images(full=True):
            xref = im[0]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                continue
            if not rects or max(r.width * r.height for r in rects) < 0.6 * area:
                continue
            try:
                pix = pymupdf.Pixmap(doc, xref)
                if pix.alpha or pix.n not in (1, 3):
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                    if pix.alpha:
                        pix = pymupdf.Pixmap(pix, 0)
                n, w, h = pix.n, pix.width, pix.height
                if np is not None:
                    a = np.frombuffer(pix.samples, np.uint8).reshape(h, w, n).astype(np.float32)
                    lum = a.mean(2)
                    ch = (a.max(2) - a.min(2)) if n == 3 else np.zeros_like(lum)
                    k = np.clip((lum - lo) / float(hi - lo), 0, 1) * (ch <= tol)
                    out = (a * (1 - k[..., None]) + 255 * k[..., None]).astype(np.uint8)
                    data = out.tobytes()
                else:
                    src = pix.samples
                    buf = bytearray(src)
                    rng = float(hi - lo)
                    for i in range(0, len(src), n):
                        if n == 3:
                            r, g, b = src[i], src[i + 1], src[i + 2]
                            if max(r, g, b) - min(r, g, b) > tol:
                                continue
                            lu = (r + g + b) / 3.0
                        else:
                            lu = src[i]
                        if lu > lo:
                            k = 1.0 if lu >= hi else (lu - lo) / rng
                            for j in range(n):
                                buf[i + j] = int(src[i + j] * (1 - k) + 255 * k)
                    data = bytes(buf)
                newpix = pymupdf.Pixmap(pix.colorspace, w, h, data, False)
                page.replace_image(xref, pixmap=newpix)
                changed += 1
            except Exception as e:
                log("  ! تعذر تنظيف صورة الصفحة / could not clean scanned page: %s" % e)
    return changed


def list_candidates(src, password=None, log=print):
    doc = pymupdf.open(src)
    if doc.needs_pass and not (password and doc.authenticate(password)):
        raise RuntimeError("password-protected")
    log("▶ %s  (%d pages)" % (os.path.basename(src), doc.page_count))
    for c in analyze(doc):
        log("  text  “%s”  pages=%d  rotated=%s  size=%s  %s" % (
            c["text"], c["pages"], c["rotated"], c["size"], "[AUTO-REMOVE]" if c["auto"] else "[repeated, kept]"))
    for xref, why in find_image_targets(doc, True).items():
        log("  image xref=%d  %s" % (xref, why))
    if pikepdf is not None:
        pdf = pikepdf.open(src, password=password or "")
        st = Stripper(pdf, [])
        if st.ocg_ids:
            log("  layers named watermark: %d" % len(st.ocg_ids))
    doc.close()


def out_path(src, outdir=None):
    base, _ = os.path.splitext(os.path.basename(src))
    folder = outdir or os.path.dirname(os.path.abspath(src))
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, base + "_clean.pdf")


# --------------------------------------------------------------------------
# GUI (tkinter) + CLI
# --------------------------------------------------------------------------
def run_gui():
    import threading
    import tkinter as tk
    from tkinter import filedialog, scrolledtext

    root = tk.Tk()
    root.title("إزالة العلامة المائية من PDF  |  PDF Watermark Remover")
    root.geometry("640x520")
    files = []

    top = tk.Frame(root, padx=10, pady=8)
    top.pack(fill="x")
    lst = tk.Listbox(top, height=5)
    lst.pack(fill="x")

    def add():
        for f in filedialog.askopenfilenames(filetypes=[("PDF", "*.pdf")]):
            if f not in files:
                files.append(f)
                lst.insert("end", f)

    def clear():
        files.clear()
        lst.delete(0, "end")

    bar = tk.Frame(top)
    bar.pack(fill="x", pady=4)
    tk.Button(bar, text="إضافة ملفات PDF  Add PDFs", command=add).pack(side="left")
    tk.Button(bar, text="مسح  Clear", command=clear).pack(side="left", padx=6)

    tk.Label(top, text="نص العلامة (اختياري، افصل بـ ;)  Watermark text (optional, separate with ;)").pack(anchor="w")
    txt = tk.Entry(top)
    txt.pack(fill="x")
    v_stamps, v_imgs, v_aggr = tk.BooleanVar(), tk.BooleanVar(), tk.BooleanVar()
    tk.Checkbutton(top, text="احذف الأختام أيضًا  Also remove stamps", variable=v_stamps).pack(anchor="w")
    tk.Checkbutton(top, text="احذف الصور الكبيرة المتكررة  Remove large repeated images", variable=v_imgs).pack(anchor="w")
    tk.Checkbutton(top, text="وضع متقدم (قد يمس نصًا قريبًا)  Aggressive mode", variable=v_aggr).pack(anchor="w")

    tk.Label(root, text=CREDIT_AR + "   |   " + CREDIT_EN, fg="#555555").pack(side="bottom", pady=4)
    logbox = scrolledtext.ScrolledText(root, height=14)
    logbox.pack(fill="both", expand=True, padx=10, pady=6)

    def log(msg):
        logbox.insert("end", msg + "\n")
        logbox.see("end")
        root.update_idletasks()

    def work(only_list):
        if not files:
            log("أضف ملف PDF أولًا / add a PDF first")
            return
        texts = [t for t in txt.get().split(";") if t.strip()]
        for f in files:
            try:
                if only_list:
                    list_candidates(f, log=log)
                else:
                    remove_watermarks(f, out_path(f), texts, v_stamps.get(), v_imgs.get(), v_aggr.get(), log=log)
            except Exception as e:
                log("  ✗ %s" % e)
        log("— انتهى / done —")

    run = tk.Frame(root)
    run.pack(pady=6)
    tk.Button(run, text="تحليل فقط  Analyze", command=lambda: threading.Thread(target=work, args=(True,), daemon=True).start()).pack(side="left", padx=6)
    tk.Button(run, text="إزالة العلامة المائية  Remove", command=lambda: threading.Thread(target=work, args=(False,), daemon=True).start()).pack(side="left", padx=6)
    root.mainloop()


def main():
    ap = argparse.ArgumentParser(description="Remove watermarks from PDF files.")
    ap.add_argument("files", nargs="*", help="PDF files")
    ap.add_argument("-o", "--outdir", help="output folder (default: next to the original)")
    ap.add_argument("--text", action="append", default=[], help="watermark text to remove (repeatable)")
    ap.add_argument("--stamps", action="store_true", help="also remove Stamp annotations")
    ap.add_argument("--all-images", action="store_true", help="also remove large images repeated on most pages")
    ap.add_argument("--aggressive", action="store_true", help="redaction fallback for text that cannot be matched in the page stream")
    ap.add_argument("--no-scan", action="store_true", help="do not clean watermarks baked into scanned page images")
    ap.add_argument("--no-auto", action="store_true", help="only remove what --text/--stamps name")
    ap.add_argument("--list", action="store_true", help="only list what looks like a watermark")
    ap.add_argument("--password", help="PDF password")
    ap.add_argument("--gui", action="store_true", help="open the window")
    a = ap.parse_args()

    if not a.gui:
        print("%s\n%s\n%s\n" % (WELCOME_AR, WELCOME_EN, CREDIT_AR))
    if a.gui or not a.files:
        try:
            run_gui()
        except ImportError:
            ap.print_help()
        return
    for f in a.files:
        try:
            if a.list:
                list_candidates(f, a.password)
            else:
                remove_watermarks(f, out_path(f, a.outdir), a.text, a.stamps, a.all_images,
                                  a.aggressive, a.password, auto=not a.no_auto, scan=not a.no_scan)
        except Exception as e:
            print("✗ %s: %s" % (f, e))


if __name__ == "__main__":
    main()
