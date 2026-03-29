import http.server
import socketserver
import json
import os

PORT = 8000
DATABASE_FILE = "database.json"

class APIServerHandler(http.server.SimpleHTTPRequestHandler):
    
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header('Content-type', content_type)
        self.end_headers()

    def _read_db(self):
        if not os.path.exists(DATABASE_FILE):
            return []
        with open(DATABASE_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

    def _write_db(self, data):
        with open(DATABASE_FILE, 'w') as f:
            json.dump(data, f, indent=4)

    def do_GET(self):
        if self.path == '/api/orders':
            self._set_headers()
            orders = self._read_db()
            self.wfile.write(json.dumps(orders).encode('utf-8'))
        else:
            # Serve normal frontend files
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/orders':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                new_order = json.loads(post_data.decode('utf-8'))
                orders = self._read_db()
                
                # Check if it exists just in case (though IDs are unique)
                if not any(o['id'] == new_order['id'] for o in orders):
                    orders.insert(0, new_order)  # Add to beginning
                    self._write_db(orders)
                    
                self._set_headers(201)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)

    def do_PATCH(self):
        if self.path.startswith('/api/orders/'):
            order_id = self.path.split('/')[-1]
            content_length = int(self.headers['Content-Length'])
            patch_data = self.rfile.read(content_length)
            
            try:
                updates = json.loads(patch_data.decode('utf-8'))
                orders = self._read_db()
                
                updated = False
                for order in orders:
                    if order['id'] == order_id:
                        order.update(updates)
                        updated = True
                        break
                        
                if updated:
                    self._write_db(orders)
                    self._set_headers(200)
                    self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                else:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Order not found"}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_DELETE(self):
        if self.path.startswith('/api/orders/'):
            order_id = self.path.split('/')[-1]
            
            orders = self._read_db()
            new_orders = [o for o in orders if o['id'] != order_id]
            
            if len(new_orders) < len(orders):
                self._write_db(new_orders)
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Order not found"}).encode('utf-8'))


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), APIServerHandler) as httpd:
        print("Serving API and Application on port", PORT)
        httpd.serve_forever()
