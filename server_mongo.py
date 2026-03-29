import http.server
import socketserver
import json
import sys
import os
from pymongo import MongoClient

# ==============================================================================
# ⚙️ MASTER CONFIGURATION ENGINE
# ==============================================================================
if os.path.exists("config.json"):
    with open("config.json", "r") as f:
        config = json.load(f)
else:
    print("❌ ERROR: config.json missing! Creating default...")
    config = {
        "WEBSITE_NAME": "CraveBites",
        "MONGODB_URI": "",
        "ADMIN_USERNAME": "admin",
        "ADMIN_PASSWORD": "password",
        "TOTAL_TABLES": 20
    }
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)

MONGO_URI = os.environ.get("MONGODB_URI", config.get("MONGODB_URI", ""))
# ==============================================================================

PORT = int(os.environ.get("PORT", 8000))

print("Initializing MongoDB Atlas connection...")

try:
    if not MONGO_URI:
        print("\n" + "="*60)
        print("ERROR: Missing MongoDB Atlas Connection String!")
        print("Please paste your MONGO_URI in server_mongo.py exactly on line 12!")
        print("="*60 + "\n")
        sys.exit(1)
        
    client = MongoClient(MONGO_URI)
    # Ping the server to verify connection securely before starting HTTP listener
    client.admin.command('ping')
    print("SUCCESS: Connected to MongoDB Atlas Cloud Database!")
    
    # Establish connection to standard Database and Collections internally
    db = client.CraveBitesDB
    orders_collection = db.Orders

except Exception as e:
    print(f"FAILED to connect to MongoDB Atlas Cloud Database: {e}")
    sys.exit(1)


class APIServerHandler(http.server.SimpleHTTPRequestHandler):
    
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header('Content-type', content_type)
        
        # Security overrides enabling GitHub Pages to hit the Cloud Server
        self.send_header('Access-Control-Allow-Origin', '*') 
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Avoid caching APIs
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()

    def do_OPTIONS(self):
        # Automatically approve pre-flight browser security checks
        self._set_headers(204)

    def do_GET(self):
        if self.path == '/api/config':
            self._set_headers()
            # SECURITY FILTER: Explicitly serve ONLY public frontend variables
            safe_config = {
                "WEBSITE_NAME": config.get("WEBSITE_NAME", "CraveBites"),
                "TOTAL_TABLES": config.get("TOTAL_TABLES", 20)
            }
            self.wfile.write(json.dumps(safe_config).encode('utf-8'))
        
        elif self.path == '/api/orders':
            self._set_headers()
            
            # Query the entire Orders collection.
            # MongoDB automatically inserts '_id' which is an ObjectID, not JSON translatable!
            # So we pass {'_id': False} to strip out the mongo-specific tracking ID.
            cursor = orders_collection.find({}, {'_id': False})
            
            # We want newest orders first, just like our raw local solution.
            # Using basic list reversal of retrieved dataset for standard LIFO
            orders = list(cursor)[::-1]
            
            self.wfile.write(json.dumps(orders).encode('utf-8'))
        else:
            # Let the subclass serve standard HTML/JS/CSS index frontends
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                credentials = json.loads(post_data.decode('utf-8'))
                
                # Check strictly against our master configuration securely hidden from the Frontend!
                valid_user = config.get("ADMIN_USERNAME", "admin")
                valid_pass = config.get("ADMIN_PASSWORD", "password")
                
                if credentials.get("username") == valid_user and credentials.get("password") == valid_pass:
                    self._set_headers(200)
                    self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                else:
                    self._set_headers(401)
                    self.wfile.write(json.dumps({"success": False, "error": "Invalid credentials"}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                
        elif self.path == '/api/orders':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                new_order = json.loads(post_data.decode('utf-8'))
                
                # Insert if order doesn't exist
                if not orders_collection.find_one({"id": new_order["id"]}):
                    orders_collection.insert_one(new_order)
                    
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
                
                result = orders_collection.update_one({'id': order_id}, {'$set': updates})
                
                if result.matched_count > 0:
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
            
            result = orders_collection.delete_one({'id': order_id})
            
            if result.deleted_count > 0:
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Order not found"}).encode('utf-8'))


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), APIServerHandler) as httpd:
        print("\nSUCCESS! Listening on http://localhost:" + str(PORT))
        print("Frontend Website & MongoDB Cloud API actively running...")
        httpd.serve_forever()
