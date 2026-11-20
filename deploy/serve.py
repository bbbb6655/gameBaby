"""在指定端口提供原型静态资源。"""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class PrototypeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, entry, **kwargs):
        self.entry = entry
        super().__init__(*args, **kwargs)

    def send_head(self):
        if urlsplit(self.path).path == "/":
            self.path = self.entry
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True, type=int, choices=[81, 82])
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()
    entry = "/index.html" if args.port == 81 else "/desktop.html"
    handler = partial(PrototypeHandler, directory=args.directory, entry=entry)
    with ThreadingHTTPServer(("0.0.0.0", args.port), handler) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
