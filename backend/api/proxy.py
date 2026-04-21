import time
import re
import hashlib
from fastapi import APIRouter, Request, Response
import httpx
import nbformat
from nbconvert import HTMLExporter

router = APIRouter(tags=["proxy"])

COLAB_DIRECT_LINK = "https://colab.research.google.com/drive/{notebook_id}"

_cache: dict = {}
_CACHE_TTL = 600

_client = httpx.AsyncClient(follow_redirects=True, timeout=30.0)


async def _fetch_notebook(notebook_id: str) -> str | None:
    drive_url = f"https://drive.google.com/uc?export=download&id={notebook_id}"
    try:
        resp = await _client.get(drive_url)
        if resp.status_code == 200:
            return resp.text
    except httpx.RequestError:
        pass
    return None


def _render_notebook_html(raw_json: str) -> str:
    nb = nbformat.reads(raw_json, as_version=4)
    exporter = HTMLExporter()
    exporter.template_name = "basic"
    html, _ = exporter.from_notebook_node(nb)

    wrapper_style = """body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:20px;background:#0d1117;color:#e6edf3}a{color:#58a6ff}"""

    dark_override = """
    *,*::before,*::after{border-color:#30363d}
    body{background:#0d1117;color:#e6edf3}
    div{color:#e6edf3;background:transparent}
    h1,h2,h3,h4,h5,h6{color:#f0f6fc !important;border-bottom-color:#21262d !important}
    a{color:#58a6ff}
    a:visited{color:#bc8cff}
    pre{background:#161b22 !important;color:#e6edf3 !important;border:1px solid #30363d;border-radius:6px;padding:12px 16px;overflow-x:auto;font-size:13px;line-height:1.5}
    pre *,pre code,pre span{color:inherit !important}
    code{font-family:'SF Mono','Fira Code','Consolas',monospace;font-size:13px;background:#161b22 !important;color:#e6edf3 !important}
    table{border-collapse:collapse;border-color:#30363d}
    th,td{border:1px solid #30363d;padding:8px 12px;color:#e6edf3}
    th{background:#161b22}
    img{max-width:100%;border-radius:6px}
    .output_png img{max-width:100%}
    .read-only-badge{position:fixed;top:12px;right:12px;background:#1f6feb;color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;z-index:10}
    .highlight .c,.highlight .c1,.highlight .cs,.highlight .cm{color:#8b949e !important}
    .highlight .k,.highlight .kn,.highlight .kd,.highlight .kp,.highlight .kr,.highlight .kt{color:#ff7b72 !important}
    .highlight .s,.highlight .s1,.highlight .s2,.highlight .sa,.highlight .sb,.highlight .sc,.highlight .sd,.highlight .se,.highlight .sh,.highlight .si,.highlight .sr,.highlight .ss,.highlight .sx{color:#a5d6ff !important}
    .highlight .n,.highlight .na,.highlight .nb,.highlight .bp{color:#79c0ff !important}
    .highlight .nf,.highlight .nc,.highlight .ne,.highlight .nd,.highlight .nt{color:#d2a8ff !important}
    .highlight .mi,.highlight .mf,.highlight .mh,.highlight .mo,.highlight .m{color:#79c0ff !important}
    .highlight .o,.highlight .ow{color:#ff7b72 !important}
    .highlight .p,.highlight .pi{color:#e6edf3 !important}
    .highlight .ni{color:#ffa657 !important}
    .highlight .fm{color:#d2a8ff !important}
    .highlight .vg,.highlight .vi{color:#ffa657 !important}
    .highlight .nv,.highlight .vm{color:#ffa657 !important}
    .highlight .err{color:#f85149 !important;background:transparent !important}
    .highlight .gd{color:#ffa198 !important;background:#490202 !important}
    .highlight .gi{color:#aff5b4 !important;background:#0f5323 !important}
    .jp-RenderedText pre{background:#161b22 !important;color:#e6edf3 !important}
    .jp-RenderedHTMLCommon,.jp-RenderedHTML{color:#e6edf3 !important}
    .jp-RenderedHTMLCommon h1,.jp-RenderedHTMLCommon h2,.jp-RenderedHTMLCommon h3,.jp-RenderedHTMLCommon h4,.jp-RenderedHTMLCommon h5,.jp-RenderedHTMLCommon h6{color:#f0f6fc !important}
    .jp-RenderedHTMLCommon table{border-color:#30363d}
    .jp-RenderedHTMLCommon th,.jp-RenderedHTMLCommon td{border-color:#30363d;color:#e6edf3}
    .jp-RenderedHTMLCommon th{background:#161b22}
    .cell{margin-bottom:16px;border-left:3px solid #30363d;padding-left:16px}
    .cell.code-cell{border-left-color:#58a6ff}
    .cell.markdown-cell{border-left-color:#a68cff}
    .output_wrapper,.output{background:transparent !important}
    .output_area,.output_subarea{background:transparent !important;color:#e6edf3 !important}
    .output_text pre,.output_text{color:#e6edf3 !important;background:transparent !important}
    .output_stderr pre{color:#f85149 !important;background:#490202 !important}
    """

    html_clean = re.sub(r"</?(body|html|head)[^>]*>", "", html)

    return (
        "<!DOCTYPE html>\n<html lang=\"en\">\n"
        "<head>\n"
        "<meta charset=\"utf-8\"/>\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n"
        f"<style>{wrapper_style}</style>\n"
        "</head>\n"
        "<body>\n"
        "<div class=\"read-only-badge\">Read Only</div>\n"
        f"{html_clean}\n"
        f"<style>{dark_override}</style>\n"
        "</body>\n"
        "</html>"
    )


async def _get_rendered_notebook(notebook_id: str) -> str | None:
    now = time.time()
    cache_key = notebook_id
    if cache_key in _cache:
        entry = _cache[cache_key]
        if now - entry["ts"] < _CACHE_TTL:
            return entry["html"]

    raw = await _fetch_notebook(notebook_id)
    if not raw:
        return None

    html = _render_notebook_html(raw)
    _cache[cache_key] = {"html": html, "ts": now}
    return html


@router.get("/colab-notebook/{notebook_id}")
async def serve_notebook(notebook_id: str):
    html = await _get_rendered_notebook(notebook_id)
    if not html:
        return Response(
            content="<html><body><h2>Could not load notebook</h2>"
                    "<p>The notebook may not be publicly shared.</p></body></html>",
            status_code=502,
            media_type="text/html",
        )
    return Response(content=html, media_type="text/html")
