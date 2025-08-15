from flask import Flask, send_from_directory, request, Response, send_file
import subprocess
import tempfile
import os
import webbrowser
import threading

app = Flask(__name__, static_folder='build', static_url_path='')

@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/process', methods=['POST'])
def process_xml_and_return_binary():
    try:
        xml_data = request.form.get('xml_data')
        if not xml_data:
            return Response("No XML data submitted", status=400)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".xml") as xml_file:
            xml_file.write(xml_data)
            xml_path = xml_file.name

        with tempfile.NamedTemporaryFile(delete=False) as bin_file:
            bin_path = bin_file.name

        exe_path = r"C:\path\to\your\real_process_app.exe"  # your processor .exe, not the Flask one
        result = subprocess.run([exe_path, xml_path, bin_path], capture_output=True)

        if result.returncode != 0:
            return Response(f"EXE failed: {result.stderr.decode('utf-8')}", status=500)

        return send_file(
            bin_path,
            as_attachment=True,
            download_name='result.bin',
            mimetype='application/octet-stream'
        )

    except Exception as e:
        return Response(f"Server error: {str(e)}", status=500)

    finally:
        for file in [locals().get('xml_path'), locals().get('bin_path')]:
            if file and os.path.exists(file):
                os.remove(file)

def open_browser():
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == '__main__':
    threading.Timer(1.0, open_browser).start()
    app.run()

