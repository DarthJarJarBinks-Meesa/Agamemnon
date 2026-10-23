"""Allowlist for a future ingest fetch.

The public assistant never imports this module. Nothing in the chat path calls
it. Tests check the allowlist without opening a connection.
"""

import urllib.request
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request

ALLOWED_PREFIXES = {
    "api.uspto.gov": ("/api/v1/patent/",),
    "image-ppubs.uspto.gov": ("/dirsearch-public/print/downloadPdf/",),
    "patents.google.com": ("/patent/",),
}


class GatewayDenied(ValueError):
    pass


def vetted_url(url: str) -> str:
    parsed = urlsplit(url)
    host = parsed.hostname
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise GatewayDenied("That endpoint is not on the ingest allowlist.")
    prefixes = ALLOWED_PREFIXES.get(host)
    if prefixes is None or not any(parsed.path.startswith(prefix) for prefix in prefixes):
        raise GatewayDenied("That endpoint is not on the ingest allowlist.")
    if parsed.fragment:
        raise GatewayDenied("That endpoint is not on the ingest allowlist.")
    return urlunsplit(("https", host, parsed.path, parsed.query, ""))


class AllowlistRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        vetted_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_allowlisted(url: str, timeout: float = 20) -> bytes:
    """Fetch one allowlisted URL. Chat and analysis never call this."""
    checked = vetted_url(url)
    opener = urllib.request.build_opener(AllowlistRedirect)
    request = Request(checked, headers={"Accept": "application/json"})
    with opener.open(request, timeout=timeout) as response:
        vetted_url(response.geturl())
        return response.read()
