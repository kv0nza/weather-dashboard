"""
SkyPulse Weather Dashboard - Python 3 Local Server
Zero dependencies, built with Python standard library
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {args[0]} - {args[1]}\n")

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("========================================================")
        print(f" SkyPulse Weather Dashboard running at: {url}")
        print(" Press Ctrl+C to stop the server.")
        print("========================================================")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == "__main__":
    main()
