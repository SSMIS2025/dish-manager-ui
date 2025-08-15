from flask import Flask, request, render_template, send_file, Response
import subprocess
import tempfile
import os

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/process', methods=['POST'])
def process_xml_and_return_binary():
    try:
        # Get XML data from the form
        xml_data = request.form.get('xml_data')
        if not xml_data:
            return Response("No XML data submitted", status=400)

        # Write XML to temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".xml") as xml_file:
            xml_file.write(xml_data)
            xml_path = xml_file.name

        # Output file path
        with tempfile.NamedTemporaryFile(delete=False) as bin_file:
            bin_path = bin_file.name

        # Run EXE with input XML and output BIN paths
        exe_path = r"C:\path\to\your\app.exe"  # ← Replace this with your actual EXE path
        result = subprocess.run([exe_path, xml_path, bin_path], capture_output=True)

        if result.returncode != 0:
            return Response(f"EXE failed: {result.stderr.decode('utf-8', errors='ignore')}", status=500)

        # Send output file back as download
        return send_file(
            bin_path,
            as_attachment=True,
            download_name="result.bin",
            mimetype='application/octet-stream'
        )

    except Exception as e:
        return Response(f"Server error: {str(e)}", status=500)

    finally:
        # Cleanup
        for file in [locals().get('xml_path'), locals().get('bin_path')]:
            if file and os.path.exists(file):
                os.remove(file)


if __name__ == '__main__':
    app.run(debug=True)

