"""Build squarespace-snippet.html: the whole tool packed into one paste-in block.

The tool runs inside an iframe built from its own HTML (srcdoc), so its styles and
element IDs can't clash with the Squarespace theme, and no separate hosting is needed.
Run after every change to index.html:  python3 build-squarespace-snippet.py
"""
import html, pathlib

here = pathlib.Path(__file__).parent
tool = (here / "index.html").read_text(encoding="utf-8")

snippet = """<!-- Safe Travels "Fix it, or trade it in?" tool. Generated from index.html by
     build-squarespace-snippet.py. Do not edit by hand; paste the whole file into an Embed Block. -->
<div id="st-fix-or-trade" style="max-width:720px;margin:0 auto;">
<iframe title="Fix it, or trade it in? - Safe Travels Mobile Repair" style="display:block;width:100%;height:1150px;border:0;background:transparent;" srcdoc="{srcdoc}"></iframe>
</div>
<script>
(function () {{
  var frame = document.querySelector('#st-fix-or-trade iframe');
  window.addEventListener('message', function (e) {{
    if (!frame || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'st-fix-or-trade-height' && e.data.height > 0) frame.style.height = e.data.height + 'px';
    if (e.data.type === 'st-fix-or-trade-scroll') {{
      var top = frame.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({{ top: top - 90, behavior: 'smooth' }});
    }}
  }});
}})();
</script>
""".format(srcdoc=html.escape(tool, quote=True))
# Keep the snippet pure ASCII so characters like – and ↗ survive any copy/paste or page encoding.
snippet = snippet.encode("ascii", "xmlcharrefreplace").decode("ascii")

(here / "squarespace-snippet.html").write_text(snippet, encoding="utf-8")
print("squarespace-snippet.html:", len(snippet), "characters")
